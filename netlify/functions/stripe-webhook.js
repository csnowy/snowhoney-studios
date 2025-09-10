export async function handler(event) {
  try {
    console.log("Webhook hit!");
    console.log("Headers:", event.headers);
    console.log("Body:", event.body);

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    console.error("Error in webhook:", err);
    return { statusCode: 500, body: "Server error" };
  }
}
