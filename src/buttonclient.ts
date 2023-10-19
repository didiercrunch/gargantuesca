import { LiftRequest} from "./shared.ts";

class ButtonClient{

    private readonly host: string;

    constructor(host: string) {
        this.host = host;
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

    async listLiftRequests(): Promise<LiftRequest[]> {
        const resp = await fetch(`${this.host}/api/v1/lift-requests`);
        const ret = await resp.json();
        return ret as LiftRequest[] ;
    }

    async createLiftRequest(direction: string, level: number): Promise<boolean> {
        const payload = {
            direction: direction,
            level: level,
        }
        const resp = await this.sendPost(`${this.host}/api/v1/lift-requests`, payload);
        return 199 < resp.status && resp.status < 300;
    }

}

async function experiment(): Promise<void>{
    const client = new ButtonClient("http://localhost:3000");
    console.log(await client.listLiftRequests());
    console.log(await client.createLiftRequest("UP", -1))
    console.log(await client.createLiftRequest("UP", -1))
    console.log(await client.listLiftRequests());
    console.log(await client.createLiftRequest("UP", 10))
    console.log(await client.createLiftRequest("UP", 10))
    console.log(await client.listLiftRequests());


}


await experiment()