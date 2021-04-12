class Deserialization {
    public parseTimestamp = (stamp: number) => new Date(stamp * 1000);
    public dateToTimestamp = (date: Date) => Math.floor(date.getTime() / 1000);
}

const _instance = new Deserialization();
export default _instance;