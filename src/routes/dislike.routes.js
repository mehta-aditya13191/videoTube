import { Router } from "express";
import {
  toggleCommentDisLike,
  toggleTweetDisLike,
  toggleVideoDisLike,
} from "../controllers/dislike.controllers.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";

const router = Router();
router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/v/:videoId").post(toggleVideoDisLike);
router.route("/toggle/c/:commentId").post(toggleCommentDisLike);
router.route("/toggle/t/:tweetId").post(toggleTweetDisLike);
// router.route("/videos").get(getLikedVideos);

export default router;
