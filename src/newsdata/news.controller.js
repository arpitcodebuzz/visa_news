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

  async gnews(req, res) {
    try {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({
          status: false,
          message: 'Query is required (e.g., "canada study visa")',
        });
      }

      const news = await newsService.fetchVisaNews(query);
      res.json(news);
    } catch (err) {
      console.error('Visa news error:', err.message);
      res.status(500).json({
        status: false,
        message: 'Failed to fetch visa news',
      });
    }
  }


  async getLatestNews(req, res) {
    try {
      const news = await newsService.fetchLatestNews(req.query);
      res.json(news);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Failed to fetch news' });
    }
  }

  async getUSCISNews(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 5;
      const news = await newsService.fetchUSCISNews(limit);
      res.json(news);
    } catch (error) {
      console.error("❌ Error in controller:", error.message);
      res.status(500).json({
        status: false,
        message: "Failed to fetch USCIS news",
        error: error.message,
      });
    }
  }

}

export default new NewsController();