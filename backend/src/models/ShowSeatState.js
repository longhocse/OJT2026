const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "ShowSeatState",
  tableName: "show_seat_states",
  uniques: [
    {
      name: "UQ_show_seat_states_show_seat",
      columns: ["show", "seat"],
    },
  ],
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    status: {
      type: "nvarchar",
      length: 20,
      default: "available",
    },
    lock_token: {
      type: "uuid",
      nullable: true,
    },
    locked_until: {
      type: "datetime2",
      nullable: true,
    },
    created_at: {
      type: "datetime2",
      createDate: true,
    },
    updated_at: {
      type: "datetime2",
      updateDate: true,
    },
  },
  relations: {
    show: {
      target: "Show",
      type: "many-to-one",
      joinColumn: { name: "show_id" },
      nullable: false,
    },
    seat: {
      target: "Seat",
      type: "many-to-one",
      joinColumn: { name: "seat_id" },
      nullable: false,
    },
    lockedByUser: {
      target: "User",
      type: "many-to-one",
      joinColumn: { name: "locked_by_user_id" },
      nullable: true,
    },
    booking: {
      target: "Booking",
      type: "many-to-one",
      joinColumn: { name: "booking_id" },
      nullable: true,
    },
  },
});
