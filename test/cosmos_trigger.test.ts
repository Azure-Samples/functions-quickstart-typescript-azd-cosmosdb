import { strict as assert } from "node:assert";
import { test } from "node:test";
import { CosmosDBChangeFeedItem, CosmosDBv4ChangeFeedMode, InvocationContext, trigger } from "@azure/functions";
import { cosmos_all_versions_and_deletes_trigger } from "../src/functions/cosmos_all_versions_and_deletes_trigger";
import { cosmos_trigger } from "../src/functions/cosmos_trigger";

interface TestDocument {
    id?: string;
    status?: string;
    [property: string]: unknown;
}

test("registers both Cosmos DB change feed mode enum values", () => {
    const latestVersionBinding = trigger.cosmosDB({
        connection: "COSMOS_CONNECTION",
        databaseName: "%COSMOS_DATABASE_NAME%",
        containerName: "%COSMOS_CONTAINER_NAME%",
        leaseContainerPrefix: "latest-version",
        changeFeedMode: CosmosDBv4ChangeFeedMode.LatestVersion
    });
    const allVersionsAndDeletesBinding = trigger.cosmosDB({
        connection: "COSMOS_CONNECTION",
        databaseName: "%COSMOS_DATABASE_NAME%",
        containerName: "%COSMOS_CONTAINER_NAME%",
        leaseContainerPrefix: "all-versions-and-deletes",
        changeFeedMode: CosmosDBv4ChangeFeedMode.AllVersionsAndDeletes
    });

    assert.equal(latestVersionBinding.changeFeedMode, "LatestVersion");
    assert.equal(latestVersionBinding.leaseContainerPrefix, "latest-version");
    assert.equal(allVersionsAndDeletesBinding.changeFeedMode, "AllVersionsAndDeletes");
    assert.equal(allVersionsAndDeletesBinding.leaseContainerPrefix, "all-versions-and-deletes");
    assert.equal(allVersionsAndDeletesBinding.databaseName, "%COSMOS_DATABASE_NAME%");
    assert.equal(allVersionsAndDeletesBinding.containerName, "%COSMOS_CONTAINER_NAME%");
});

test("logs latest-version Cosmos DB documents", async () => {
    const logs: string[] = [];
    const context = new InvocationContext({ functionName: "cosmos_trigger" });
    context.log = (...args: unknown[]): void => {
        logs.push(args.join(" "));
    };

    await cosmos_trigger([{ id: "item-1" }, { id: "item-2" }], context);

    assert.ok(logs.includes("Cosmos DB function processed 2 documents"));
    assert.ok(logs.includes("First document id: item-1"));
    assert.ok(logs.includes("First document id: item-2"));
});

test("logs AllVersionsAndDeletes Cosmos DB changes", async () => {
    const logs: string[] = [];
    const context = new InvocationContext({ functionName: "cosmos_all_versions_and_deletes_trigger" });
    context.log = (...args: unknown[]): void => {
        logs.push(args.join(" "));
    };

    const changes: CosmosDBChangeFeedItem<TestDocument>[] = [
        {
            current: { id: "item-1", status: "created" },
            metadata: { operationType: "create", crts: 1, lsn: 1 }
        },
        {
            current: { id: "item-1", status: "updated" },
            metadata: { operationType: "replace", crts: 2, lsn: 2 }
        },
        {
            current: {},
            metadata: { operationType: "delete", crts: 3, lsn: 3, id: "item-1" }
        },
        {
            current: {},
            metadata: { operationType: "delete", crts: 4, lsn: 4, id: "item-2", timeToLiveExpired: true }
        }
    ];

    await cosmos_all_versions_and_deletes_trigger(changes, context);

    assert.ok(logs.includes("Cosmos DB AllVersionsAndDeletes function processed 4 changes"));
    assert.ok(logs.includes("Operation: create; document id: item-1"));
    assert.ok(logs.includes("Operation: replace; document id: item-1"));
    assert.ok(logs.includes("Operation: delete; document id: item-1"));
    assert.ok(logs.includes("Document item-2 was deleted because its TTL expired."));
    assert.ok(!logs.includes("Current document: {}"));
});