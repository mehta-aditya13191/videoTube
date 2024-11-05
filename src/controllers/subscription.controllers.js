import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscriptions.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription

  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  if (channelId === req.user?._id.toString()) {
    throw new ApiError(400, "you can't subscribe your own channel");
  }

  let isSubscribed;

  const isSubscriber = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (!isSubscriber) {
    throw new ApiError(404, "Subscriber not found while toggling");
  }

  if (isSubscriber) {
    const Unsubscribed = await Subscription.deleteOne({
      subscriber: req.user?._id,
      channel: channelId,
    });

    if (!Unsubscribed) {
      throw new ApiError(500, "Something went wrong while unsubscribing");
    }

    isSubscribed = false;
  } else {
    const newSubscriber = await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });

    if (!newSubscriber) {
      throw new ApiError(500, "Something went wrong while subscribing");
    }
    isSubscribed = true;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSubscribed },
        `${isSubscribed ? "Subscribed " : "Unsubscribed"}`
      )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  if (channelId !== req.user?._id.toString()) {
    throw new ApiError(401, "you are not authorized for this action");
  }

  const allSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
        pipeline: [
          {
            $project: {
              _id: 0,
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
        subscribers: {
          $first: "$subscribers",
        },
        subscriberCount: { $size: "$subscribers" },
      },
    },
    {
      $project: {
        _id: 0,
        subscribers: 1,
        subscriberCount: 1,
      },
    },
  ]);

  if (!allSubscribers || allSubscribers.length === 0) {
    throw new ApiError(404, "No subscribers found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allSubscribers,
        "All Subscribers of a channel fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId || !isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriberId");
  }

  if (subscriberId !== req.user?._id.toString()) {
    throw new ApiError(401, "you are not authorized  to perfom this action");
  }

  const allSubscibedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
        pipeline: [
          {
            $project: {
              _id: 0,
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
        channelDetails: { $first: "$channelDetails" },
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "channel",
        foreignField: "channel",
        as: "channelSubscribers",
      },
    },
    {
      $addFields: {
        "channelDetails.isSubscribed": {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user?._id),
                "$channelSubscribers.subscriber",
              ],
            },
            then: true,
            else: false,
          },
        },
        "channelDetails.subscribersCount": {
          $size: "$channelSubscribers",
        },
      },
    },
    {
      $project: {
        _id: 0,
        channelDetails: 1,
      },
    },
  ]);

  if (!allSubscibedChannels || allSubscibedChannels.length === 0) {
    throw new ApiError(404, "No channels found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allSubscibedChannels,
        "All Subscribed channel fetched successfully"
      )
    );
});

export { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription };
