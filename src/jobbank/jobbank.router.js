import { Router } from "express";
const routes = Router()
import jobController from '../jobbank/jobbank.controller'

routes.get('/scrape', jobController.getJobBankData);


export default routes