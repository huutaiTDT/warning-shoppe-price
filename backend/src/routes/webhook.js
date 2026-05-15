/** @format */
import { Router } from "express";
import {
  importProductsWebhookHandler,
  webhookHandler,
} from "../services/webhook.service.js";
const router = Router();

router.post("/scan-price", webhookHandler);
router.post("/import-shop-products", importProductsWebhookHandler);

export default router;
