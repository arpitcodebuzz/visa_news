import { Router } from "express";
const routes = Router()
import visadataController from '../aivisa/visadata.controller.js'

// routes.get('/visa-infom',visadataController.getVisaInfo); 


routes.get("/visa-groq",visadataController.getVisaInfo);


export default routes