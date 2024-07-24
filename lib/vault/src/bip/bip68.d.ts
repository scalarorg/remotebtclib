interface Bip68 {
    sequence: number;
    estimate?: number;
    type: string;
}
export declare function timeBlock(numOfBlocks: number): Bip68;
export declare function timeSecond(seconds: number): Bip68;
export declare function timeDay(days: number): Bip68;
export {};
