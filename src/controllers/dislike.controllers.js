import { isValidObjectId } from "mongoose";

import { Dislike } from "../models/dislike.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoDisLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Dislike.findOne({
    video: videoId,
    dislikedBy: req.user?._id,
  });

  let dislikeOnVideo;

  if (video) {
    const undoDislike = await Dislike.deleteOne({
      video: videoId,
      dislikedBy: req.user?._id,
    });

    if (!undoDislike) {
      throw new ApiError(500, "something went wrong while toggling dislike ");
    }

    dislikeOnVideo = false;
  } else {
    const newdisLike = await Dislike.create({
      video: videoId,
      dislikedBy: req.user?._id,
    });

    if (!newdisLike) {
      throw new ApiError(500, "Somthing went wrong while disliking the video");
    }
    dislikeOnVideo = true;
  }

  return res.status(200).json(
    new ApiResponse(
      200,

      { dislikeOnVideo },
      `${dislikeOnVideo ? "disliked " : "unDisliked"}`
    )
  );
});

const toggleCommentDisLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const comment = await Dislike.findOne({
    comment: commentId,
    dislikedBy: req.user?._id,
  });

  let dislikeOnComment;

  if (comment) {
    const undoDislike = await Dislike.deleteOne({
      comment: commentId,
      dislikedBy: req.user?._id,
    });

    if (!undoDislike) {
      throw new ApiError(
        500,
        "something went wrong while toggling the dislike"
      );
    }

    dislikeOnComment = false;
  } else {
    const newDisLike = await Dislike.create({
      comment: commentId,
      dislikedBy: req.user?._id,
    });

    if (!newDisLike) {
      throw new ApiError(
        500,
        "Somthing went wrong while disliking the comment"
      );
    }
    dislikeOnComment = true;
  }

  return res.status(200).json(
    new ApiResponse(
      200,

      { dislikeOnComment },
      `${dislikeOnComment ? "disliked " : "unDisliked"}`
    )
  );
});

const toggleTweetDisLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const tweet = await Dislike.findOne({
    tweet: tweetId,
    dislikedBy: req.user?._id,
  });

  let dislikeOnTweet;

  if (tweet) {
    const undodislike = await Dislike.deleteOne({
      tweet: tweetId,
      dislikedBy: req.user?._id,
    });

    if (!undodislike) {
      throw new ApiError(
        500,
        "something went wrong while toggling the dislike"
      );
    }

    dislikeOnTweet = false;
  } else {
    const newdisLike = await Dislike.create({
      tweet: tweetId,
      dislikedBy: req.user?._id,
    });

    if (!newdisLike) {
      throw new ApiError(500, "Somthing went wrong while disliking the tweet");
    }
    dislikeOnTweet = true;
  }

  return res.status(200).json(
    new ApiResponse(
      200,

      { dislikeOnTweet },
      `${dislikeOnTweet ? "disliked " : "unDisliked"}`
    )
  );
});

export { toggleCommentDisLike, toggleTweetDisLike, toggleVideoDisLike };
