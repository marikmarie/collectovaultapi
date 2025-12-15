import axios from "axios";
import { config } from "./config";

const client = axios.create({
  baseURL: config.COLLECTO_BASE_URL,
  headers: {
    "x-api-key": config.COLLECTO_API_KEY,
    "Content-Type": "application/json"
  },
  timeout: 15000
});

export async function fetchTransactionsForCustomer(collectoCustomerId: string, params?: { from?: string; to?: string; limit?: number }) {
  // Example: your actual collecto API path might differ. Adjust path & params accordingly.
  const res = await client.get(`/customers/${encodeURIComponent(collectoCustomerId)}/transactions`, {
    params: params || {}
  });
  return res.data; // normalize based on response format
}

export async function fetchInvoice(collectoCustomerId: string, invoiceId: string) {
  const res = await client.get(`/customers/${encodeURIComponent(collectoCustomerId)}/invoices/${encodeURIComponent(invoiceId)}`);
  return res.data;
}

export async function validateUserTokenWithCollecto(bearerToken: string) {
  const res = await axios.get(`${config.COLLECTO_BASE_URL}/`, {
    headers: {
      Authorization: bearerToken,
      "x-api-key": config.COLLECTO_API_KEY
    }
  });
  return res.data; 
}
