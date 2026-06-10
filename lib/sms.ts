interface SmsAdapter {
  send(phone: string, message: string): Promise<void>;
}

const consoleAdapter: SmsAdapter = {
  async send(phone, message) {
    console.log(`[SMS DEV] To: ${phone} | Message: ${message}`);
  },
};

const textlkAdapter: SmsAdapter = {
  async send(phone, message) {
    const recipient = phone.replace(/^\+/, '');
    const res = await fetch(process.env.TEXTLK_API_URL!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TEXTLK_API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        recipient,
        sender_id: process.env.TEXTLK_SENDER_ID,
        type: 'plain',
        message,
      }),
    });

    if (!res.ok) throw new Error('SMS send failed: non-2xx response');

    const data = await res.json();
    if (data.status === 'error') throw new Error('SMS send failed: provider error');
  },
};

function getAdapter(): SmsAdapter {
  if (process.env.SMS_PROVIDER === 'textlk') return textlkAdapter;
  return consoleAdapter;
}

export async function sendSms(phone: string, message: string): Promise<void> {
  await getAdapter().send(phone, message);
}
