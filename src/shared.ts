export type Lift = {
    id: number,
    level: number,
    direction: string,
    destinations: number[]
}

export type SmallLiftRepresentation = {
    id: number,
    level: number,
}

export type LiftFilterCriteron = {
    floor?: number,
    min_floor?: number,
    max_floor?: number,
    direction?: string,
}


export type LiftRequest = {
    direction: string,
    level: number,
}