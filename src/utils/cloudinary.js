import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath, folderName = "videoTube") => {
  try {
    if (!localFilePath) {
      return null;
    }
    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folderName, // Specify the folder name here
    });

    // File has been uploaded successfully
    // console.log("File is uploaded on Cloudinary", response);
    fs.unlinkSync(localFilePath); // Delete the local file after upload

    return response;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error.message);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // Remove locally saved temporary file if upload failed
    }
    throw error; // Re-throw the error to handle it in the calling function
  }
};

const deleteFromCloudinary = async (url, resourceType = "image") => {
  if (!url) {
    return null;
  }

  const publicId = url.split("/").pop().split(".")[0]; // Extract public ID from URL
  // console.log("public id of url:-->", publicId);

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log(`Deleted image with ID: ${publicId}`);
  } catch (error) {
    console.error(`Failed to delete image: ${error.message}`);
    throw new ApiError(500, "Failed to delete old avatar image");
  }
};

export { deleteFromCloudinary, uploadOnCloudinary };
