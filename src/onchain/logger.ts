export function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${step}] ${message}`);
  if (data !== undefined) {
    console.log(
      JSON.stringify(
        data,
        (key, value) => (typeof value === "bigint" ? value.toString() : value),
        2
      )
    );
  }
}