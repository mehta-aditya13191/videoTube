import mongoose, { isValidObjectId } from "mongoose";
import { Dislike } from "../models/dislike.models.js";
import { Like } from "../models/like.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { tweet } = req.body;
  //TODO: create tweet

  if (!tweet || tweet.trim() === "") {
    throw new ApiError(400, "Tweet content cannot be empty");
  }

  const createdTweet = await Tweet.create({
    content: tweet.trim(),
    owner: req.user?._id,
  });

  const detailOftweet = await Tweet.aggregate([
    {
      $match: {
        _id: createdTweet._id,
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
              _id: 1,
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
        owner: { $first: "$owner" },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
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
      },
    },
    {
      $lookup: {
        from: "dislikes",
        localField: "_id",
        foreignField: "tweet",
        as: "dislikes",
      },
    },
    {
      $addFields: {
        dislikesCount: { $size: "$dislikes" },
        isDisliked: {
          $cond: {
            if: { $in: [req.user?._id, "$dislikes.dislikedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        content: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        dislikesCount: 1,
        isDisliked: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, detailOftweet[0], "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user Id");
  }

  const Alltweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    {
      $lookup: {
        from: "dislikes",
        localField: "_id",
        foreignField: "tweet",
        as: "dislikes",
      },
    },
    {
      $addFields: {
        dislikesCount: { $size: "$dislikes" },
      },
    },
    {
      $project: {
        owner: 1,
        likesCount: 1,
        dislikesCount: 1,
      },
    },
    //sort by latest
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        Alltweets,
        "All tweets of the user are fetched successfully"
      )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === "") {
    throw new ApiError(400, "Please write a tweet to update");
  }

  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "You are not authorize to edit the tweet");
  }

  tweet.content = content.trim();
  tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid comment Id");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "You are not authorize to delete the tweet");
  }

  // removing the like comment for this comment
  await Like.deleteMany({ tweet: tweetId });
  await Dislike.deleteMany({ tweet: tweetId });

  await Tweet.findByIdAndDelete(tweetId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted successfully"));
});

export { createTweet, deleteTweet, getUserTweets, updateTweet };
