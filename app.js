const express = require('express');
const app = express();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://mqdckrtdwdmbjybiwbfx.supabase.co"
const supabaseKey = process.env.SBKEY;

const supabase = createClient(supabaseUrl, supabaseKey)

app.use(express.json())

const cors = require("cors");

const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');

app.use(cors({
  origin: "*"
}))

app.post('/api/search', express.json(), async (req, res) => { 
    res.set('Access-Control-Allow-Origin', '*')

    const countryCodes = [
        "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
        "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
        "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
        "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
        "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
        "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
        "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
        "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
        "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
        "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
        "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
        "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
        "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
        "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
        "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
        "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW"
    ];

    const languageCodes = [
      "aa", "ab", "ae", "af", "ak", "am", "an", "ar", "as", "av", "ay", "az",
      "ba", "be", "bg", "bh", "bi", "bm", "bn", "bo", "br", "bs", "ca", "ce",
      "ch", "co", "cr", "cs", "cu", "cv", "cy", "da", "de", "dv", "dz", "ee",
      "el", "en", "eo", "es", "et", "eu", "fa", "ff", "fi", "fj", "fo", "fr",
      "fy", "ga", "gd", "gl", "gn", "gu", "gv", "ha", "he", "hi", "ho", "hr",
      "ht", "hu", "hy", "hz", "ia", "id", "ie", "ig", "ii", "ik", "io", "is",
      "it", "iu", "ja", "jv", "ka", "kg", "ki", "kj", "kk", "kl", "km", "kn",
      "ko", "kr", "ks", "ku", "kv", "kw", "ky", "la", "lb", "lg", "li", "ln",
      "lo", "lt", "lu", "lv", "mg", "mh", "mi", "mk", "ml", "mn", "mr", "ms",
      "mt", "my", "na", "nb", "nd", "ne", "ng", "nl", "nn", "no", "nr", "nv",
      "ny", "oc", "oj", "om", "or", "os", "pa", "pi", "pl", "ps", "pt", "qu",
      "rm", "rn", "ro", "ru", "rw", "sa", "sc", "sd", "se", "sg", "si", "sk",
      "sl", "sm", "sn", "so", "sq", "sr", "ss", "st", "su", "sv", "sw", "ta",
      "te", "tg", "th", "ti", "tk", "tl", "tn", "to", "tr", "ts", "tt", "tw",
      "ty", "ug", "uk", "ur", "uz", "ve", "vi", "vo", "wa", "wo", "xh", "yi",
      "yo", "za", "zh", "zu"
    ];

    let keyword = req.body.keyword || ""
    let language = req.body.hl || "en"
    let location = req.body.gl || "us"
    let apiKey = req.get("X-API-KEY")

    location = location.trim().toUpperCase()
    language = language.trim().toLowerCase()

    if (keyword.length < 1) {
        res.status(400).send("No keyword provided.")
        return;
    }

    if (countryCodes.includes(location) == false) {
        res.status(400).send("Invalid country code.")
        return;
    }

    if (languageCodes.includes(language) == false) {
        res.status(400).send("Invalid language code.")
        return;
    }

    if (!(apiKey)) {
        res.status(403).send("Invalid API key.")
        return [];
    }
  
    const { data:user } = await supabase
    .from('uservals')
    .select('searches')
    .eq("key", apiKey)

    if (user.length > 0) {
        if (!(user[0])) {
            res.status(403).send("Invalid API key.")
            return [];
        }
    } else {
        res.status(403).send("Invalid API key.")
        return [];
    }

    let creditsLeft = parseInt(user[0].searches)-1
  
    if (user[0].searches < 1) {
      res.status(403).send("No credits remaining.")
      return;
    } else {
      await supabase
      .from('uservals')
      .update({ searches:creditsLeft })
      .eq("key", apiKey)
    }

    var first_part = "https://suggestqueries.google.com/complete/search?";
    var url = first_part + 'q=' + keyword + '&hl=' + language + '&gl=' + location + "&client=chrome&_=" + ('' + Math.random()).replace(/\D/g, "");

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    const agent = new HttpsProxyAgent('http://brd-customer-hl_7365483f-zone-datacenter_proxy1:oq53nk4imw9m@brd.superproxy.io:22225')

    var options = {
        auth: {
            username: "brd-customer-hl_7365483f-zone-datacenter_proxy1",
            password: "oq53nk4imw9m"
        },
        host: 'brd.superproxy.io',
        port: 22225
    };
    const config = {
        url: "https://lumtest.com/myip.json",
        proxy: false,
        httpsAgent: agent
    }
   axios.request(config).then(function(data){ 
        res.send(data)
        //let allKeywords = []
        //let toParse = data.data
        //for (let p = 0; p < toParse[1].length; p++) {
        //    allKeywords.push(toParse[1][p])
        //}
        //res.send(JSON.stringify({ account: { credits: creditsLeft, api_key:apiKey }, meta: { gl:location, hl:language, keyword:keyword }, data: { keywords:allKeywords } }))
     }).catch((e) => res.send(e));
})

app.listen(4242, () => console.log('Running on port 4242'));