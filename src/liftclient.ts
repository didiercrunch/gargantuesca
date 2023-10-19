import {Lift, LiftFilterCriteron, SmallLiftRepresentation} from "./shared.ts";
import {h} from "https://esm.sh/stable/preact@10.8.1/denonext/preact.mjs";

class LiftClient{

    private readonly host: string;

    constructor(host: string) {
        this.host = host;
    }

    async listElevators(): Promise<SmallLiftRepresentation[]> {
        const resp = await fetch(`${this.host}/api/v1/lifts`);
        const ret = await resp.json();
        return ret.lifts as SmallLiftRepresentation[] ;
    }

    async filterLifts(criteron: LiftFilterCriteron):  Promise<SmallLiftRepresentation[]> {
        const searchParams =  new URLSearchParams(criteron);
        const resp = await fetch(`${this.host}/api/v1/lifts?${searchParams}`);
        const ret = await resp.json();
        return ret.lifts as SmallLiftRepresentation[];
    }

    async getLiftById(id: number): Promise<Lift | null> {
        const resp = await fetch(`${this.host}/api/v1/lifts/${id}`);
        if(resp.status === 404){
            return null;
        }
        return (await resp.json()) as Lift;
    }

    private async sendPost(url: string, payload: unknown): Promise<Response>{
        return  await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
    }

    async moveLift(liftId: number, newLevel: number): Promise<boolean> {
        const payload = {
            type: 'lift-move',
            level: newLevel,
        }
        const resp = await this.sendPost(`${this.host}/api/v1/lifts/${liftId}`, payload);
        return 199 < resp.status && resp.status < 300;
    }

    async openLiftDoor(liftId: number): Promise<boolean> {
        const lift = await this.getLiftById(liftId);
        if(lift == null){
            return false;
        }
        const payload = {
            type: 'door-open',
            level: lift.level,
        }
        const resp = await this.sendPost(`${this.host}/api/v1/lifts/${liftId}`, payload);
        return 199 < resp.status && resp.status < 300;
    }

    async setDestination(liftId: number, newDestination: number): Promise<boolean> {
        const payload = {
            type: 'add-destination',
            destination: newDestination,
        }
        const resp = await this.sendPost(`${this.host}/api/v1/lifts/${liftId}`, payload);
        return 199 < resp.status && resp.status < 300;
    }
}

async function experiment(): Promise<void>{
    const client = new LiftClient("http://localhost:3000");
    console.log(await client.getLiftById(2));
    console.log(await client.setDestination(2, -1))
    console.log(await client.setDestination(2, 11))
    console.log(await client.setDestination(2, 16))
    console.log(await client.setDestination(2, 14))
    console.log(await client.setDestination(2, -1))


    console.log(await client.getLiftById(2));
    console.log(await client.openLiftDoor(2))
    console.log(await client.getLiftById(2));
}


await experiment()