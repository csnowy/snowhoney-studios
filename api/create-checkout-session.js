import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Map your UI strings to Price IDs you created in the Dashboard
const PRICE_MAP = {
  // one-time site builds:
  "One-Page Site": process.env.PRICE_ONEPAGE,   // e.g. price_1...
  "Two-Page Site": process.env.PRICE_TWOPAGE,
  "Three-Page Site": process.env.PRICE_THREEPAGE,

  // subscriptions (monthly hosting):
  "Basic Hosting": process.env.PRICE_HOST_BASIC,    // recurring
  "Grow Hosting": process.env.PRICE_HOST_GROW,      // recurring
  "Local SEO Hosting": process.env.PRICE_HOST_SEO   // recurring
};

export default async function handler(req, res){
  try{
    const { pkg, hosting, email, businessName, domains } = req.body || {};
    if(!pkg || !PRICE_MAP[pkg]) {
      return res.status(400).json({ error: 'Unknown package selection' });
    }

    const oneTimePriceId = PRICE_MAP[pkg];
    const isManagedHosting = hosting && hosting !== 'self';
    const recurringPriceId = isManagedHosting ? PRICE_MAP[hosting] : null;

    // Build line items
    const line_items = [
      { price: oneTimePriceId, quantity: 1 }
    ];
    if (recurringPriceId) {
      line_items.push({ price: recurringPriceId, quantity: 1 });
    }

    // Choose mode: 'payment' for one-time only, 'subscription' if hosting included
    const mode = recurringPriceId ? 'subscription' : 'payment';

    // Create (or reuse) a Customer so Checkout collects address for taxes
    const customer = email
      ? await stripe.customers.create({ email, name: businessName })
      : undefined;

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customer?.id,
      line_items,
      // Stripe Tax: automatic tax on Checkout + collect full billing address
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      customer_update: { address: 'auto' },
      allow_promotion_codes: true,

      // Useful metadata to receive back in your webhook
      metadata: {
        pkg,
        hosting: hosting || 'self',
        businessName: businessName || '',
        domains: (domains || []).join(',')
      },

      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${req.headers.origin}/#payment`
    });

    return res.status(200).json({
      sessionId: session.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (err){
    console.error(err);
    return res.status(500).json({ error: 'Stripe error. Check server logs.' });
  }
}
