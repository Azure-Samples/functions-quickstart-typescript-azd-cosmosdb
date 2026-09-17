import { app, CosmosDBv4ChangeFeedMode, InvocationContext } from "@azure/functions";

interface SampleDocument {
    id?: string;
    [property: string]: unknown;
}

export async function cosmos_latest_version_trigger(documents: SampleDocument[], context: InvocationContext): Promise<void> {
    context.log(`Cosmos DB LatestVersion function processed ${documents.length} documents`);

    for (const document of documents) {
        context.log(`LatestVersion document id: ${document.id ?? "unknown"}`);
    }
}

app.cosmosDB<SampleDocument>('cosmos_latest_version_trigger', {
    connection: 'COSMOS_CONNECTION',
    databaseName: '%COSMOS_DATABASE_NAME%',
    containerName: '%COSMOS_CONTAINER_NAME%',
    leaseContainerName: 'leases',
    leaseContainerPrefix: 'latest-version',
    changeFeedMode: CosmosDBv4ChangeFeedMode.LatestVersion,
    handler: cosmos_latest_version_trigger
});