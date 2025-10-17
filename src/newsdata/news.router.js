import { Router } from "express";
const routes = Router()
import newsController from '../newsdata/news.controller'


routes.get('/newsData',newsController.newsData)


routes.get('/gnews',newsController.gnews)


routes.get('/latest', newsController.getLatestNews);

routes.get('/uscis-news', newsController.getUSCISNews);



export default routes;