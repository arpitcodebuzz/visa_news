import newsService from '../newsdata/news.service'

class NewsController {
  async newsData(req, res) {
    try {
      const data = await newsService.newsData();
      res.json(data);
    } 
    catch (err) {
      console.error("Controller error:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new NewsController();