import express from "express";
import { serve, setup } from "swagger-ui-express";
import path from "path";
import YAML from "yamljs";

// require("dotenv").config();
import dotenv from 'dotenv'
dotenv.config();

const router = express.Router();
// console.log(path.join(__dirname, "../../../swagger-docs/admin-swagger/swagger.yml"))
const swaggerDocument = YAML.load(path.join(__dirname, "../../../swagger-docs/admin-swagger/swagger.yml"));

if (process.env.NODE_ENV !== "production") {
  router.use(
    "/",
    (req, res, next) => {
      swaggerDocument.info.title = `${process.env.APP_NAME} admin-api`;
      swaggerDocument.info.version = "1.0";
      swaggerDocument.servers = [
        {
          url: `${process.env.LOCAL_URL}/admin-api`,
          description: "API base url",
        },
        {
          url: `${process.env.BASE_URL}/admin-api`,
          description: "API base url",
        },
        {
          url: `${process.env.BASE_URL}/admin-api`,
          description: "API base url Devlopment",
        }
      ];
      req.swaggerDoc = swaggerDocument;
      next();
    },
    serve,
    setup(swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
}

export default router;

