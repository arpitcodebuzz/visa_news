import { Router } from "express";
const routes = Router()
import newsController from '../newsdata/news.controller'


routes.get('/newsData', newsController.newsData)


routes.get('/gnews', newsController.gnews)


routes.get('/latest', newsController.getLatestNews);

routes.get('/uscis-news', newsController.getUSCISNews);

routes.get('/get-news', newsController.getNews);

routes.get('/timesOfIndiaNews', newsController.getTimesOfIndiaNews);

routes.get("/visaguide", newsController.getVisaGuideNews);




routes.get("/visa-news", newsController.getTavilynews);

routes.get("/visaSerpi", newsController.getSerpiNews);





export default routes;