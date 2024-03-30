const express = require('express');
const app = express();
const Stripe = require("stripe")

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://mqdckrtdwdmbjybiwbfx.supabase.co"
const supabaseKey = process.env.SBKEY;

const supabase = createClient(supabaseUrl, supabaseKey)

const stripe = Stripe(process.env.STRIPEKEY);

const cors = require("cors")
app.use(cors({
  origin: "https://keywordquill.com"
}))

app.use((req, res, next) => {
    if (req.originalUrl === '/webhook') {
      next();
    } else if(req.originalUrl === '/checkout' || '/billing') {
      express.urlencoded({ extended:true })(req, res, next);
    } else {
      express.json()(req, res, next);
    }
});

app.post('/checkout', async (req, res) => {  
    let plan = req.body.plan
    let { data: data, error } = await supabase
    .from('customers')
    .select(`stripeId`)
    .eq('userId', String(req.body.userId))
  
    if (data.length > 0 && !error) {
      const customer = data[0]["stripeId"]
      const session = await stripe.checkout.sessions.create({
        line_items: [{price: plan == "25" ? "price_1OyvZ0FRwTzdGfU6ffRAwyfO" : plan == "100" ? "price_1OyvaZFRwTzdGfU6aJWemXfe" : "price_1OyvazFRwTzdGfU6POdFSTkn", quantity:1}],
        mode: 'payment',
        allow_promotion_codes: true,
        customer,
        success_url: `https://keywordquill.com/dashboard`,
        cancel_url: `https://keywordquill.com/dashboard`,
      });
  
      res.redirect(303, session.url);
    } else {
      const customerBody = await stripe.customers.create({
        email: req.body.userEmail,
        metadata: { SBuserId: req.body.userId }
      });
  
      let { data: data, error } = await supabase
      .from('customers')
      .insert([
        { userId: String(req.body.userId), userEmail: String(req.body.userEmail), stripeId: String(customerBody.id) },
      ])
  
      if(error) return;
  
      const customer = customerBody.id;
      const session = await stripe.checkout.sessions.create({
        line_items: [{price: plan == "25" ? "price_1OyvZ0FRwTzdGfU6ffRAwyfO" : plan == "100" ? "price_1OyvaZFRwTzdGfU6aJWemXfe" : "price_1OyvazFRwTzdGfU6POdFSTkn", quantity:1}],
        mode: 'payment',
        allow_promotion_codes: true,
        customer,
        success_url: `https://keywordquill.com/dashboard`,
        cancel_url: `https://keywordquill.com/dashboard`,
      });
  
      res.redirect(303, session.url);
    }
  });

app.post('/billing', async (req, res) => {  
    let { data: data, error } = await supabase
    .from('customers')
    .select(`stripeId`)
    .eq('userId', String(req.body.userId))
  
    if (data.length > 0 && !error) {
        const session = await stripe.billingPortal.sessions.create({
           customer: data[0]["stripeId"],
           return_url: 'https://keywordquill.com/dashboard',
        });
  
        res.redirect(303, session.url);
    }  
});

app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
    const sig = request.headers['stripe-signature'];
    let endpointSecret = process.env.WHSEC
  
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const { data: customers, error } = await supabase
      .from('customers')
      .select(`userId, userEmail`)
      .eq('stripeId', String(session.customer))

      const { data: searches } = await supabase
      .from('uservals')
      .select("searches")
      .eq("id", customers[0].userId)

      let adding = 0
      const lineItems = session.display_items || session.line_items.data;

      const priceId = lineItems[0].price.id;
      if (priceId == "price_1OyvZ0FRwTzdGfU6ffRAwyfO") {
        adding = 25000
      } else if(priceId == "price_1OyvaZFRwTzdGfU6aJWemXfe"){
        adding = 125000
      } else if(priceId == "price_1OyvazFRwTzdGfU6POdFSTkn"){
        adding = 400000
      }

      let toUpdateSearches = parseInt(searches[0].searches) + adding

      await supabase
      .from('uservals')
      .update({ searches:toUpdateSearches })
      .eq("id", customers[0].userId)
    }  
    response.sendStatus(200);
  });

app.listen(8080, () => console.log('Running on port 8080'));
