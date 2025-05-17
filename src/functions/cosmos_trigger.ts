import { app, InvocationContext } from "@azure/functions";

export async function cosmos_trigger(documents: unknown[], context: InvocationContext): Promise<void> {
    context.log(`Cosmos DB function processed ${documents.length} documents`);

    if (documents && documents.length > 0) {
        for (const doc of documents) {
            context.log(`First document: ${JSON.stringify(doc)}`);
            if (doc && typeof doc === "object" && "id" in doc) {
                context.log(`First document id: ${(doc as { id?: string }).id}`);
            }
        }
    } else {
        context.log("No documents found.");
    }
}

app.cosmosDB('cosmos_trigger', {
    connection: 'COSMOS_CONNECTION',
    databaseName: 'documents-db',
    containerName: 'documents',
    createLeaseCollectionIfNotExists: true,
    handler: cosmos_trigger
});
