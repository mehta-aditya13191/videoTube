import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controllers.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";

const router = Router();
router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router
  .route("/c/:channelId")
  .get(getUserChannelSubscribers)
  .post(toggleSubscription);

router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router;
