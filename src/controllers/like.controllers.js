import { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  let likeOnVideo;

  if (video) {
    const unlike = await Like.deleteOne({
      video: videoId,
      likedBy: req.user?._id,
    });

    if (!unlike) {
      throw new ApiError(500, "something went wrong while unliking the video");
    }

    likeOnVideo = false;
  } else {
    const newLike = await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });

    if (!newLike) {
      throw new ApiError(500, "Somthing went wrong while liking the video");
    }
    likeOnVideo = true;
  }

  return res.status(200).json(
    new ApiResponse(
      200,

      { likeOnVideo },
      `${likeOnVideo ? "liked " : "unliked"}`
    )
  );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const comment = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  let likeOnComment;

  if (comment) {
    const unlike = await Like.deleteOne({
      comment: commentId,
      likedBy: req.user?._id,
    });

    if (!unlike) {
      throw new ApiError(
        500,
        "something went wrong while unliking the comment"
      );
    }

    likeOnComment = false;
  } else {
    const newLike = await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });

    if (!newLike) {
      throw new ApiError(500, "Somthing went wrong while liking the comment");
    }
    likeOnComment = true;
  }

  return res.status(200).json(
    new ApiResponse(
      200,

      { likeOnComment },
      `${likeOnComment ? "liked " : "unliked"}`
    )
  );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const tweet = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  let likeOnTweet;

  if (tweet) {
    const unlike = await Like.deleteOne({
      tweet: tweetId,
      likedBy: req.user?._id,
    });

    if (!unlike) {
      throw new ApiError(500, "something went wrong while unliking the tweet");
    }

    likeOnTweet = false;
  } else {
    const newLike = await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });

    if (!newLike) {
      throw new ApiError(500, "Somthing went wrong while liking the tweet");
    }
    likeOnTweet = true;
  }

  return res.status(200).json(
    new ApiResponse(
      200,

      { likeOnTweet },
      `${likeOnTweet ? "liked " : "unliked"}`
    )
  );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const { page = 1, limit = 10 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // const allLikedVideo = await Like.find({
  //   likedBy: req.user?._id,
  // });
  // console.log(allLikedVideo);
  // let arr = [];
  // for (let i = 0; i < allLikedVideo.length; i++) {
  //   let p = {
  //     video_id: allLikedVideo[i].video ? allLikedVideo[i].video : "null",
  //     like_id: allLikedVideo[i].video ? allLikedVideo[i].likedBy : "null",
  //   };
  //   arr.push(p);
  // }
  // // console.log(arr);
  // let info = [];
  // let getVideoInfo;
  // for (let i = 0; i < arr.length; i++) {
  //   if (arr[i].video_id != "null") {
  //     console.log(arr[i].video_id);
  //     console.log(arr[i].like_id);
  //     getVideoInfo = await Video.find({ owner: arr[i].video_id });
  //     console.log(getVideoInfo);
  //   }
  // }

  // for (let i = 0; i < getVideoInfo.length; i++) {
  //   const userInfo = await User.findById(getVideoInfo[i].owner);
  //   console.log(userInfo);
  //   let p = {
  //     title: getVideoInfo[i].title,
  //     description: getVideoInfo[i].description,
  //     owner: {
  //       userName: userInfo.userName,
  //       fullName: userInfo.fullName,
  //       Avatar: userInfo.avatar,
  //     },
  //   };

  //   info.push(p);
  // }

  // res.status(200).json(new ApiResponse(200, info, "Fetched successfully"));

  const allLikedVideo = await Like.aggregate([
    {
      $match: {
        likedBy: req.user?._id,
      },
    },
    { $match: { video: { $exists: true } } },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $match: {
              isPublished: true,
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
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },

    {
      $addFields: {
        videos: {
          $first: "$videos",
        },
      },
    },
  ]);

  if (!allLikedVideo) {
    throw new ApiError(404, "No liked Video is found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allLikedVideo,
        "All liked video are fetched successfully"
      )
    );
});

export { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike };
