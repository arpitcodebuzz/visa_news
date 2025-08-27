import axios from 'axios';
import * as cheerio from 'cheerio';

class jobService {
  async scrapeJobBank(keyword = 'job', location = 'Toronto, ON', sort = 'M') {
    const encodedKeyword = encodeURIComponent(keyword);
    const encodedLocation = encodeURIComponent(location);
    const encodedSort = encodeURIComponent(sort);
    const url = `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${encodedKeyword}&locationstring=${encodedLocation}&locationparam=0&sort=${encodedSort}`;

    const jobs = [];

    try {
      // console.log('🔍 Fetching job list from:', url);
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      const $ = cheerio.load(data);
      // console.log('✅ Loaded HTML, length:', $.html().length);

      const jobLinks = [];

      $('a[href*="/jobsearch/jobposting/"]').each((_, el) => {
        const jobPath = $(el).attr('href');
        const fullLink = jobPath ? 'https://www.jobbank.gc.ca' + jobPath : '';
        if (fullLink && fullLink.includes('/jobsearch/jobposting/')) {
          jobLinks.push(fullLink);
        }
      });

      // console.log('🔗 Found job links:', jobLinks.length, jobLinks.slice(0, 3)); // Preview first 3 links

      for (const jobLink of jobLinks.slice(0, 10)) {
        try {
          const job = await this.scrapeJobDetails(jobLink);
          console.log('📄 Scraped job:', job);
          if (job?.status) {
            jobs.push(job.data);
          } else {
            console.warn('⚠️ Failed job scrape:', jobLink);
          }
        } catch (err) {
          console.error('❌ Error scraping job details:', jobLink, err.message);
        }
      }

      return { status: true, jobs };
    } catch (error) {
      console.error('❌ scrapeJobBank failed:', error.message);
      return {
        status: false,
        message: 'Scraping failed!',
        error: error.message,
      };
    }
  }

 async scrapeJobDetails(jobUrl) {
  try {
    const { data } = await axios.get(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const $ = await cheerio.load(data);

    const jobTitle = $('h1').first().text().trim();
    const employer = $('li:contains("Employer")').find('.job-posting-brief__text').text().trim();
    const location = $('li:contains("Location")').find('.job-posting-brief__text').text().trim();
    const salary = $('li:contains("Salary")').find('.job-posting-brief__text').text().trim();
    const datePosted = $('li:contains("Posted on")').find('.job-posting-brief__text').text().trim();
    const jobType = $('li:contains("Terms of employment")').find('.job-posting-brief__text').text().trim();
    const education = $('dt:contains("Education")').next('dd').text().replace(/\s+/g, ' ').trim();
    const experience = $('dt:contains("Experience")').next('dd').text().replace(/\s+/g, ' ').trim();
    const languages = $('dt:contains("Languages")').next('dd').text().replace(/\s+/g, ' ').trim();
    const workEnv = $('dt:contains("Work setting")').next('dd').text().replace(/\s+/g, ' ').trim();
    const employmentGroups = $('dt:contains("Employment groups")').next('dd').text().replace(/\s+/g, ' ').trim();
    const jobDescription = $('#job-details-section')
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    return {
      status: true,
      data: {
        jobTitle,
        employer,
        location,
        salary,
        datePosted,
        jobType,
        education,
        experience,
        languages,
        workEnv,
        employmentGroups,
        jobDescription,
        sourceUrl: jobUrl,
      },
    };
  } catch (error) {
    console.error('❌ scrapeJobDetails failed:', jobUrl, error.message);
    return {
      status: false,
      message: 'Failed to fetch job details',
      error: error.message,
    };
  }
}

}

export default new jobService();
