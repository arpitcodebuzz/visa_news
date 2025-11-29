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
      console.error("❌Error in controller:", error.message);
      res.status(500).json({
        status: false,
        message: "Failed to fetch USCIS news",
        error: error.message,
      });
    }
  }

  async getNews(req, res) {
    try {
      const news = await newsService.getNews();
      res.json(news);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Failed to fetch news' });
    }
  }

  async getTimesOfIndiaNews(req, res) {
    try {
      const news = await newsService.getTimesOfIndiaNews(req.query);
      res.json(news);
    }
    catch (error) {
      console.error(error);
      res.status(500).json({ status: false, message: 'Failed to fetch news' });
    }
  }

  async getVisaGuideNews(req, res) {
    try {
      const result = await newsService.scrapeVisaGuideNews();
      res.status(200).json(result);
    } catch (error) {
      console.error("Controller Error:", error);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  }



  async getTavilynews(req, res) {
    const { country } = req.query;
    const news = await newsService.fetchVisaNewsWithFullContent(country);
    res.status(news.status ? 200 : 500).json(news);
  }

  async getSerpiNews(req, res) {
    const country = req.query.country || null;
    // const page = req.query.page ? parseInt(req.query.page) : 1;
    // const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    try {
      const result = await newsService.getSerpiNews(country);
      res.status(result.status ? 200 : 500).json(result);
    } catch (error) {
      res.status(500).json({ status: false, message: "Server Error", error: error.message });
    }
  }

}

export default new NewsController();