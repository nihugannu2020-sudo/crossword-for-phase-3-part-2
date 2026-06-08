export async function onRequest(context) {
  const method = context.request.method;
  if (method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH") {
    return new Response(`Method ${method} Not Allowed`, {
      status: 405,
      headers: {
        "Allow": "GET, HEAD, OPTIONS",
        "Content-Type": "text/plain"
      }
    });
  }
  return context.next();
}
