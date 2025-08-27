import { Router } from "express";
const routes = Router()
import newsController from '../newsdata/news.controller'


routes.get('/newsData',newsController.newsData)


export default routes;