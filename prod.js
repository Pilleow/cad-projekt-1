export class Prod {
    static nextId = 1;

    constructor(match, result) {
        this.match = match;
        this.result = result;
        this.id = Prod.nextId++;
    }
}
