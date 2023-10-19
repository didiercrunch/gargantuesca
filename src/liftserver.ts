// @deno-types="npm:@types/express@4.17.20"
import express, {Response, Request} from "npm:express@4.18.2";
import bodyParser from "npm:body-parser@1.20.2";
import {Lift, LiftFilterCriteron, LiftRequest, SmallLiftRepresentation} from "./shared.ts";
import c from "https://esm.sh/v132/@babel/runtime@7.22.15/denonext/helpers/getPrototypeOf.js";

const app = express()
app.use(bodyParser.json());

const port = 3000;

type LiftSearchRequestParams = {
    floor?: string,
    min_floor?: string,
    max_floor?: string,
    direction?: string,
}

type LiftAction = {
    type: string,
    level?: number,
    destination?: number,
}

class ButtonService{
    private readonly liftRequests : LiftRequest[] = [];

    getLiftRequests(): LiftRequest[]{
        return this.liftRequests;
    }

    addLiftRequest(liftRequest: LiftRequest): boolean{
        for(const lr of this.liftRequests){
            if(lr.level === liftRequest.level && lr.direction === liftRequest.direction){
                return false;
            }
        }
        this.liftRequests.push(liftRequest);
        return true;
    }
}

class LiftService {

    private readonly lifts: Lift[];

    constructor(lifts: Lift[]) {
        this.lifts = lifts;
    }

    getAllLifts(): Lift[] {
        return this.lifts;
    }

    private computeDirection(lift: Lift): string{
        if(lift.destinations.length === 0){
            return "IDLE";
        }
        const nextDestination = lift.destinations[0];
        if(nextDestination === lift.level){
            return lift.direction;
        }
        if(nextDestination > lift.level){
            return "UP";
        }
        return "DOWN";
    }

    private isBetween(x: number, min_: number, max_: number): boolean{
        return min_ < x && x < max_;
    }

    private addDestination(destinations: number[], currentLevel: number, newDestination: number){
        if(destinations.length === 0){
            return [newDestination];
        }
        if(destinations.includes(newDestination)){
            return destinations;
        }

        const firstDestination = destinations[0];
        if(this.isBetween(newDestination, currentLevel, firstDestination)){
            return [newDestination].concat(destinations);

        }
        for(let i = 0; i < destinations.length - 1; i++){
            const first = destinations[i];
            const second = destinations[i + 1];
            if(this.isBetween(newDestination, first, second)){
                const firstPart = destinations.slice(0, i + 1);
                const secondPart = destinations.slice(i + 1);
                return firstPart.concat([newDestination]).concat(secondPart);
            }
        }
        return destinations.concat([newDestination]);

    }

    processAddDestination(liftId: number, level: number): boolean {
        const lift = this.getElevatorById(liftId);
        if(!lift){
            return false;
        }
        lift.destinations = this.addDestination(lift.destinations, lift.level, level);
        lift.direction = this.computeDirection(lift);
        return true;
    }

    processDoorOpen(liftId: number, level: number): boolean {
        const lift = this.getElevatorById(liftId);
        if(!lift){
            return false;
        }
        lift.destinations = this.removeFromArray(lift.destinations, level);
        lift.direction = this.computeDirection(lift);
        return true;
    }
    removeFromArray(lst: number[], toRemove: number): number[] {
        const ret: number[] = [];
        for(const e of lst){
            if(e !== toRemove){
                ret.push(e);
            }
        }
        return ret
    }

    processLiftMovement(liftId: number, level: number): boolean {
        const lift = this.getElevatorById(liftId);
        if(!lift){
            return false;
        }
        lift.level = level;
        return true;
    }

    private matches(lift: Lift, liftFilterCriteria: LiftFilterCriteron) {
        if (liftFilterCriteria.floor !== undefined && lift.level != liftFilterCriteria.floor) {
            return false;
        }

        if (liftFilterCriteria.min_floor !== undefined && lift.level < liftFilterCriteria.min_floor) {
            return false;
        }

        if (liftFilterCriteria.max_floor !== undefined && lift.level > liftFilterCriteria.max_floor) {
            return false;
        }

        if (liftFilterCriteria.direction !== undefined && lift.direction !== liftFilterCriteria.direction) {
            return false;
        }

        return true;
    }

    getAllListsMatching(liftFilterCriteria: LiftFilterCriteron): Lift[] {
        const ret: Lift[] = [];
        for (const lift of this.lifts) {
            if (this.matches(lift, liftFilterCriteria)) {
                ret.push(lift);
            }
        }
        return ret;
    }

    getElevatorById(id: number): Lift | null {
        for (const lift of this.lifts) {
            if (lift.id === id) {
                return lift;
            }
        }
        return null;
    }
}


function createLiftService(): LiftService {
    const defaultLifts: Lift[] = [
        {id: 1, level: 12, direction: 'IDLE', destinations: []},
        {id: 2, level: -1, direction: 'IDLE', destinations: []},
        {id: 3, level: 5, direction: 'IDLE', destinations: []},
        {id: 4, level: 17, direction: 'IDLE', destinations: []},
    ];
    return new LiftService(defaultLifts);
}

function toSmallRepresentation(lifts: Lift[]): SmallLiftRepresentation[] {
    const ret: SmallLiftRepresentation[] = [];
    for (const lift of lifts) {
        ret.push({id: lift.id, level: lift.level});
    }
    return ret;

}

const liftService = createLiftService();

const buttonService = new ButtonService();

function send404(res: Response): void {
    res.status(404);
    res.send({});
}

function send400(res: Response): void {
    res.status(400);
    res.send({});
}

app.get('/api/v1/lifts', (req: Request, res: Response): void => {
    const query = req.query as LiftSearchRequestParams;
    const criterion = liftSearchRequestParamsToLiftFilterCriteria(query);
    const ret = liftService.getAllListsMatching(criterion);
    res.send({lifts: toSmallRepresentation(ret)})
});

app.get('/api/v1/lifts/:id', (req: Request<{ id: string }>, res: Response): void => {
    const id = req.params.id;
    const ret = liftService.getElevatorById(parseInt(id));
    if (ret == null) {
        return send404(res);
    }
    res.send(ret)
});

app.post('/api/v1/lifts/:id', (req: Request<{ id: string }>, res: Response): void => {
    const id = parseInt(req.params.id);
    const ret = liftService.getElevatorById(id);
    if (ret == null) {
        return send404(res);
    }
    const action = req.body as LiftAction | null;
    if(!action || !isValidAction(action)){
        return send400(res)
    }
    if(action.type === 'lift-move'){
        liftService.processLiftMovement(id, action.level!);
    }
    if(action.type === 'door-open'){
        liftService.processDoorOpen(id, action.level!);
    }
    if(action.type === 'add-destination'){
        liftService.processAddDestination(id, action.destination!);
    }

    res.send(ret)
});

app.get('/api/v1/lift-requests',  (req: Request, res: Response): void => {
    res.send(buttonService.getLiftRequests());
});

app.post('/api/v1/lift-requests',  (req: Request, res: Response): void => {
    const changed = buttonService.addLiftRequest(req.body as LiftRequest);
    res.send({changed: changed});
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

function liftSearchRequestParamsToLiftFilterCriteria(query: LiftSearchRequestParams): LiftFilterCriteron {
    const ret: LiftFilterCriteron = {};
    if (query.direction !== undefined) {
        ret.direction = query.direction;
    }
    if (query.floor !== undefined) {
        ret.floor = parseInt(query.floor);
    }
    if (query.max_floor !== undefined) {
        ret.max_floor = parseInt(query.max_floor);
    }
    if (query.min_floor !== undefined) {
        ret.min_floor = parseInt(query.min_floor);
    }
    return ret;
}

function isLevel(x: any): boolean{
    const allLevels = [
        -2, -1, 1, 2, 3, 4, 5,
        6, 7, 8, 9, 10, 11, 12,
        13, 14, 15, 16, 17, 18];
    return allLevels.includes(x);
}

function isValidAction(action?: LiftAction): boolean {
    if(!action){
        return false;
    }
    if(action.type === "lift-move" || action.type === "door-open" ){
        return isLevel(action.level);
    }
    if(action.type === "add-destination" ){
        return isLevel(action.destination);
    }
    return false;
}
