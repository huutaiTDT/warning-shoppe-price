/** @format */
import { Router } from "express";
import { webhookHandler } from "../services/webhook.service.js";
const router = Router();

router.post("/scan-price", webhookHandler);

export default router;
