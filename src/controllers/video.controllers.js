import mongoose, { isValidObjectId } from "mongoose";
import { Dislike } from "../models/dislike.models.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    throw new ApiError(400, "Title and Description are required.");
  }
  // TODO: get video, upload to cloudinary, create video

  //taking video from local path
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  //validating that video is uploaded by user or not
  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "VideoFile and Thumbnail are required.");
  }

  //uploadin on cloudinary
  const videoFile = await uploadOnCloudinary(videoLocalPath, "Videos");
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, "Thumbnails");

  if (!videoFile || !thumbnail) {
    throw new ApiError(500, "Error while uploading the video or thumbnail.");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description: description || " ",
    duration: videoFile.duration || 0,
    owner: req.user?._id,
  });

  if (!video) {
    throw new ApiError(500, "Error while creating video.");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video is uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
        comments: {
          $size: "$likes.comments",
        },
      },
    },
    {
      $lookup: {
        from: "dislikes",
        localField: "_id",
        foreignField: "video",
        as: "dislikes",
      },
    },
    {
      $addFields: {
        dislikesCount: { $size: "$dislikes" },
        IsDisLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$dislikes.dislikedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscriberCount: { $size: "$subscribers" },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              avatar: 1,
              fullName: 1,
              username: 1,
              subscriberCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        owner: 1,
        comments: 1,
        likesCount: 1,
        isLiked: 1,
        dislikesCount: 1,
        IsDisLiked: 1,
      },
    },
  ]);

  if (!video?.length) {
    throw new ApiError(404, "Video not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: {
        views: 1,
      },
    },
    {
      new: true,
    }
  );
  video[0].views = updatedVideo.views;

  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res.status(200).json(new ApiResponse(200, video[0], "Video found"));
});

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // Build match conditions
  const matchConditions = [];

  if (query) {
    matchConditions.push(
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } }
    );
  }

  if (userId) {
    matchConditions.push({
      owner: new mongoose.Types.ObjectId(userId),
    });
  }

  // Build the aggregation pipeline
  const videos = await Video.aggregate([
    {
      $match: {
        $or: matchConditions.length > 0 ? matchConditions : [{}],
      },
    },
    {
      $match: { isPublished: true },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    {
      $project: {
        _id: 1,
        owner: 1,
        videoFile: 1,
        thumbnail: 1,
        createdAt: 1,
        description: 1,
        title: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $skip: (pageNum - 1) * limitNum,
    },
    {
      $limit: limitNum,
    },
  ]);

  // Validate results
  if (!videos || videos.length === 0) {
    throw new ApiError(404, "Videos not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos are fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  // Validate video ID
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(404, "Invalid videoId");
  }

  //check the user is updating their own video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Check if the user is updating their own video
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "You are not authorized to update this video");
  }

  // Check if at least one field is provided
  const hasUpdateFields =
    title || description || req.files?.videoFile || req.files?.thumbnail;
  if (!hasUpdateFields) {
    throw new ApiError(
      400,
      "Please provide either title, description, thumbnail, or video file to update"
    );
  }

  // Prepare object for updates
  const whatToUpdate = {};

  // Update title and description if provided
  if (title) whatToUpdate.title = title;
  if (description) whatToUpdate.description = description;

  // Handle video file update if provided
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  if (videoFileLocalPath) {
    const video = await Video.findById(videoId);
    if (video?.videoFile) {
      await deleteFromCloudinary(video.videoFile, "video"); // Pass the URL directly
    }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath, "Videos");

    if (!videoFile) {
      throw new ApiError(400, "Error while updating the video file");
    }

    whatToUpdate.videoFile = videoFile.url;
  }

  // Handle thumbnail update if provided
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (thumbnailLocalPath) {
    const video = await Video.findById(videoId);
    if (video?.thumbnail) {
      await deleteFromCloudinary(video.thumbnail, "image"); // Pass the URL directly
    }
    const thumbnail = await uploadOnCloudinary(
      thumbnailLocalPath,
      "Thumbnails"
    );

    if (!thumbnail) {
      throw new ApiError(400, "Error while updating the thumbnail");
    }

    whatToUpdate.thumbnail = thumbnail.url;
  }

  // console.log("updatingggggg-------->  ", whatToUpdate);

  // Update the video with the provided fields
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: whatToUpdate },
    { new: true }
  );

  // Send response with updated video details
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  const video = await Video.findById(videoId);
  if (!videoId) {
    throw new ApiError(404, "The video you want to delete is not found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "You are not authorized to delete this video");
  }

  const oldthumbnail = video?.thumbnail;
  if (oldthumbnail) {
    await deleteFromCloudinary(oldthumbnail, "image");
  }

  const oldVideoFile = video?.videoFile;
  if (oldVideoFile) {
    await deleteFromCloudinary(oldVideoFile, "video");
  }

  //removing all the comment and all the like of the video
  await Comment.deleteMany({ video: videoId });
  await Like.deleteMany({ video: videoId });
  await Dislike.deleteMany({ video: videoId });

  //remove the video from database
  await Video.findByIdAndDelete(videoId);

  // Remove video ID from users' watchHistory
  await User.updateMany(
    { watchHistory: videoId },
    { $pull: { watchHistory: videoId } }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(
      404,
      "Video not Found while changing the publishedStatus"
    );
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      401,
      "You are not authorized to change the Status this video"
    );
  }

  const newVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: { isPublished: !video?.isPublished },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, newVideo, "published status is changed successfully")
    );
});

export {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
};
