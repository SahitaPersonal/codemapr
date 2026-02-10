// Test file for CodeFlow Pro extension
// Right-click anywhere in this file and look for "Generate File Flowchart"

export class TestClass {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    greet(): string {
        return `Hello, ${this.name}!`;
    }

    calculate(a: number, b: number): number {
        if (a > b) {
            return a - b;
        } else {
            return b - a;
        }
    }
}

export function testFunction(value: number): boolean {
    return value > 0;
}
