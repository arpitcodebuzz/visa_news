import jobService from './jobbank.service.js';

class jobController {
  async getJobBankData(req, res) {
    try {
      const { keyword = 'job', location = 'Toronto, ON', sort = 'M' } = req.query;

      const result = await jobService.scrapeJobBank(keyword, location, sort);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

export default new jobController();
