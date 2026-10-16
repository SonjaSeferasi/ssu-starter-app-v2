import { accessToken } from '../../lib/account/session';
export async function friendsRequest(query = '', body?: Record<string, unknown>) {
  const token = await accessToken();
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch('/api/friends'+query, { method:body?'POST':'GET',cache:'no-store',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}) });
  const data=await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to update this connection.');
  return data;
}
