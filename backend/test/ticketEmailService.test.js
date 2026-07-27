const test = require("node:test");
const assert = require("node:assert/strict");

const { buildTicketEmail } = require("../src/services/ticketEmailService");

test("ticket email embeds the QR as a portable inline PNG attachment", async () => {
  const booking = {
    id: "11111111-1111-4111-8111-111111111111",
    ticket_code: "MT-EMAIL-QR",
    status: "confirmed",
    total_price: 10000,
    user: { name: "MovieTap User", email: "user@example.com" },
    show: {
      id: "22222222-2222-4222-8222-222222222222",
      start_time: "2026-07-29T12:00:00.000Z",
      movie: { title: "Test Movie" },
      screen: { name: "Screen 1", theater: { name: "MovieTap" } },
    },
    bookingSeats: [{ seat: { row: "A", number: 1 } }],
    payment: { amount: 10000 },
  };

  const email = await buildTicketEmail(booking);

  assert.equal(email.attachments.length, 1);
  const [qr] = email.attachments;
  assert.equal(qr.filename, "MT-EMAIL-QR.png");
  assert.equal(qr.contentType, "image/png");
  assert.equal(qr.contentDisposition, "inline");
  assert.match(qr.cid, /^ticket-[a-f0-9-]+@movietap\.local$/i);
  assert.ok(Buffer.isBuffer(qr.content));
  assert.deepEqual([...qr.content.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(email.html.includes(`src="cid:${qr.cid}"`));
});
