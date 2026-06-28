// lib/momo.ts
import axios from "@/utils/axiosInstance";

const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY!;
const apiUser = process.env.MOMO_API_USER!;
const apiKey = process.env.MOMO_API_KEY!;
const momoBaseURL = "https://sandbox.momodeveloper.mtn.com";

export const getAccessToken = async () => {
  const res = await axios.post(
    `${momoBaseURL}/collection/token/`,
    {},
    {
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        Authorization: `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString("base64")}`,
      },
    }
  );
  return res.data.access_token;
};

export const requestToPay = async ({
  amount,
  externalId,
  phone,
  token,
}: {
  amount: string;
  externalId: string;
  phone: string;
  token: string;
}) => {
  const uuid = crypto.randomUUID();
  const res = await axios.post(
    `${momoBaseURL}/collection/v1_0/requesttopay`,
    {
      amount,
      currency: "EUR",
      externalId,
      payer: {
        partyIdType: "MSISDN",
        partyId: phone,
      },
      payerMessage: "Payment for goods",
      payeeNote: "Thank you for your purchase",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": uuid,
        "X-Target-Environment": "sandbox",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-Type": "application/json",
      },
    }
  );
  return { uuid, res: res.data };
};
