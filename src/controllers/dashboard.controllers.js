import { Subscription } from "../models/subscriptions.models.js";
import { Tweet } from "../models/tweet.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const videoInfo = await Video.aggregate([
    {
      $match: {
        owner: req.user?._id,
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
      $lookup: {
        from: "dislikes",
        localField: "_id",
        foreignField: "video",
        as: "dislikes",
      },
    },
    {
      $project: {
        likesOnVideo: {
          $size: "$likes",
        },
        dislikesOnVideo: {
          $size: "$dislikes",
        },
        viewsOnVideo: "$views",
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $count: {} },
        totalViews: { $sum: "$viewsOnVideo" },
        totalLikes: { $sum: "$likesOnVideo" },
        totalDislikes: { $sum: "$dislikesOnVideo" },
      },
    },
  ]);

  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: req.user?._id,
      },
    },
    {
      $count: "Subscribers",
    },
  ]);

  const totaltweets = await Tweet.aggregate([
    {
      $match: {
        owner: req.user?._id,
      },
    },
    {
      $count: "totalTweets",
    },
  ]);

  const channelStats = {};
  channelStats.channelOwnerName = req.user?.fullName;
  channelStats.channelOwnerUsername = req.user?.username;
  channelStats.channelOwnerAvatar = req.user?.avatar;
  channelStats.totalvideos = (videoInfo && videoInfo[0]?.totalVideos) || 0;
  channelStats.totalViews = (videoInfo && videoInfo[0]?.totalViews) || 0;
  channelStats.totalLikes = (videoInfo && videoInfo[0]?.totalLikes) || 0;
  channelStats.totalDislikes = (videoInfo && videoInfo[0]?.totalDislikes) || 0;
  channelStats.totalSubscribers =
    (totalSubscribers && totalSubscribers[0]?.Subscribers) || 0;
  channelStats.totaltweets = totaltweets && totaltweets[0]?.totalTweets;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelStats,
        "All stats of a channel are fetched successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const totalVideos = await Video.aggregate([
    {
      $match: {
        owner: req.user?._id,
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
        likes: {
          $size: "$likes",
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
        dislikes: {
          $size: "$dislikes",
        },
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $addFields: {
        comments: {
          $size: "$comments",
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        title: 1,
        description: 1,
        isPublished: 1,
        thumbnail: 1,
        likes: 1,
        dislikes: 1,
        comments: 1,
        createdAt: 1,
        title: 1,
        views: 1,
      },
    },
  ]);

  if (!totalVideos) {
    throw new ApiError(404, "Video not availaible");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, totalVideos, "All videos are fetched successfully")
    );
});

export { getChannelStats, getChannelVideos };
