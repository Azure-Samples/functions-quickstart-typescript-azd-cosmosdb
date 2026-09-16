import { app, CosmosDBChangeFeedItem, InvocationContext } from "@azure/functions";

interface SampleDocument {
    id?: string;
    [property: string]: unknown;
}

export async function cosmos_full_fidelity_trigger(changes: CosmosDBChangeFeedItem<SampleDocument>[], context: InvocationContext): Promise<void> {
    context.log(`Cosmos DB full-fidelity function processed ${changes.length} changes`);

    for (const change of changes) {
        const operationType = change.metadata?.operationType ?? "unknown";
        const documentId = change.current?.id ?? change.metadata?.id ?? "unknown";

        context.log(`Operation: ${operationType}; document id: ${documentId}`);

        if (change.current && Object.keys(change.current).length > 0) {
            context.log(`Current document: ${JSON.stringify(change.current)}`);
        }

        if (change.metadata?.timeToLiveExpired) {
            context.log(`Document ${documentId} was deleted because its TTL expired.`);
        }
    }
}

app.cosmosDB<SampleDocument>('cosmos_full_fidelity_trigger', {
    connection: 'COSMOS_CONNECTION',
    databaseName: '%COSMOS_DATABASE_NAME%',
    containerName: '%COSMOS_CONTAINER_NAME%',
    leaseContainerName: 'leases',
    leaseContainerPrefix: 'full-fidelity',
    changeFeedMode: 'FullFidelity',
    handler: cosmos_full_fidelity_trigger
});