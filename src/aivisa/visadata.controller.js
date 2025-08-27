import visaService from '../aivisa/visadata.service.js';

// class visaController {
//   async getVisaInfo(req, res) {
//     const { from, to } = req.query;

//     if (!from || !to) {
//       return res.status(400).json({
//         status: false,
//         message: 'Both `from` and `to` country names are required.'
//       });
//     }

//     try {
//       const data = await visaService.getVisaDetails(from, to);
//       res.json({
//         status: true,
//         message: `Visa info from ${from} to ${to}`,
//         data
//       });
//     } catch (err) {
//       console.error('AI Visa Info Error:', err.message);
//       res.status(500).json({ status: false, message: 'AI API error' });
//     }
//   }
// }

// export default new visaController()



import visadataService from '../aivisa/visadata.service.js'

class visadataController {
   async getVisaInfo(req, res) {
    try {
      const { from, to, purpose = 'tourism' } = req.query;

      if (!from) {
        return res.status(400).json({
          status: false,
          message: "Please provide the 'from' country."
        });
      }

      if (to) {
        const rawResponse = await visadataService.getVisaInfoService(from, to, purpose);
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No valid JSON object found");

        const parsed = JSON.parse(jsonMatch[0]);

        return res.json({
          status: true,
          from,
          to,
          visa: parsed.visas, 
          country_info: parsed.country_info,
          cost_of_living_comparison: parsed.cost_of_living_comparison
        });
      }

      const supportedCountries = ['Canada', 'USA', 'UK', 'Australia', 'New Zealand', 'Germany'];
      const allVisaInfo = [];

      for (const destCountry of supportedCountries) {
        try {
          const raw = await visadataService.getVisaInfoService(from, destCountry, purpose);
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (!jsonMatch) continue;

          const parsed = JSON.parse(jsonMatch[0]);

          allVisaInfo.push({
            to: destCountry,
            visa: parsed.visas, 
            country_info: parsed.country_info,
            cost_of_living_comparison: parsed.cost_of_living_comparison
          });
        } catch (err) {
          console.warn(`Skipping ${destCountry}: ${err.message}`);
          continue;
        }
      }

      return res.json({
        status: true,
        from,
        results: allVisaInfo
      });

    } catch (err) {
      console.error("Visa Controller Error:", err.message);
      return res.status(500).json({
        status: false,
        message: "Failed to retrieve or parse visa data",
        error: err.message
      });
    }
  }
}

export default new visadataController()