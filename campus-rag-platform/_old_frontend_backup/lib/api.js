import axios from "axios";
import { createClient } from "./supabase-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export async function apiRequest(method, path, data) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return axios({
    method,
    url: `${API_URL}${path}`,
    data,
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
}
