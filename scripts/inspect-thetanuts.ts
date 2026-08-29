const URL =
    "https://round-snowflake-9c31.devops-118.workers.dev/";

async function main() {
    console.log("Fetching Thetanuts data...");

    const response = await fetch(URL);

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
        );
    }

    const data = await response.json();

    console.dir(data, {
        depth: null
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});