import Stripe from 'stripe';
export const config = { api: { bodyParser: false } }; // raw body for signature verify

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

function readRawBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

export default async function handler(req, res){
  const sig = req.headers['stripe-signature'];
  const buf = await readRawBody(req);

  let event;
  try{
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  }catch(err){
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // React to key events
  switch(event.type){
    case 'checkout.session.completed': {
      // Payment (and subscription start if present) succeeded
      const session = event.data.object;
      // TODO: provision order (save to DB, send emails, etc.)
      break;
    }
    case 'invoice.paid': {
      // Recurring invoice paid (e.g., hosting month 2+)
      const invoice = event.data.object;
      // TODO: mark hosting as active for this period
      break;
    }
    case 'invoice.payment_failed': {
      // Subscription payment failed
      const invoice = event.data.object;
      // TODO: notify customer and/or pause hosted services
      break;
    }
    default:
      // fallthrough
  }

  res.json({received: true});
}
