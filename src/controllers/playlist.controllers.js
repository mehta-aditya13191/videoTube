import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  //TODO: create playlist
  if (!name || name.trim() === "") {
    throw new ApiError(400, "Name is required");
  }

  const createdPlaylist = await Playlist.create({
    name: name.trim(),
    description: description.trim() || "",
    owner: req.user?._id,
  });

  if (!createdPlaylist) {
    throw new ApiError(500, "error while creating playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, createPlaylist, "Playlist created successfully")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  const playlists = await Playlist.find({
    owner: userId,
    // new mongoose.Types.ObjectId(userId)
  });

  if (!playlists) {
    throw new ApiError(404, "no playlist is there.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "All playlist are fetched successfully. ")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlistId");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist Id");
  }

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "you are not authorized to add to this playlist");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const videoAlreadyExist = playlist.videos.some(
    (ele) => ele.toString() === videoId
  );

  if (videoAlreadyExist) {
    throw new ApiError(400, "Video already exist in it ");
  }

  playlist.videos.push(video._id);

  await playlist.save();

  res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist Id");
  }

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      401,
      "you are not authorized to remove video from this playlist"
    );
  }

  const videoAlreadyExist = playlist.videos.some(
    (ele) => ele.toString() === videoId
  );

  if (!videoAlreadyExist) {
    throw new ApiError(400, "Video does not exist in the playlist ");
  }

  playlist.videos.remove(videoId);

  await playlist.save();

  res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video removed to playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlistId");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist does not exist");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "You are not authorized to delete this playlist");
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletedPlaylist) {
    throw new ApiError(500, "Error while deleting the playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Playlist Deleted Successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist Id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist does not exist");
  }

  if (playlist.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "You are not authorized to update the playlist");
  }

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Please provide name ");
  }

  playlist.name = name.trim();
  playlist.description = description.trim() || "";

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
};
