# MovieTap – Answer Sheet JavaScript/TypeScript

> **Mức độ liên quan:** Day 1–4 liên quan trực tiếp vì MovieTap dùng JavaScript ở cả React frontend và Express backend. Các ví dụ thực tế gồm `map/filter/reduce`, callback middleware, closure trong Axios interceptor và graceful shutdown, `async/await`, Promise, `setInterval`, `package.json`, Redux Persist và cookie refresh token. Day 5 không liên quan trực tiếp vì project hiện không dùng TypeScript; câu trả lời phần này dựa trên TypeScript chuẩn.

## Day 1 – JavaScript Advanced

### Higher-order functions

1. Higher-order function (HOF) là hàm nhận một hoặc nhiều hàm làm tham số, hoặc trả về một hàm.
2. Hàm thường chủ yếu nhận/trả dữ liệu; HOF thao tác với hàm như một giá trị. Ví dụ project dùng middleware và callback của `map`.
3. HOF hỗ trợ tái sử dụng, composition, tách “làm gì” khỏi “duyệt như thế nào” và giảm mutable state.
4. `map` biến đổi từng phần tử và trả mảng mới; `filter` giữ phần tử đạt điều kiện; `reduce` gộp mảng thành một giá trị.
5. Dùng `forEach` khi cần side effect và không cần mảng kết quả, ví dụ gọi hàm cho từng signal; dùng `map` khi cần biến đổi dữ liệu.
6. HOF thường tạo/trả callback; callback đó có thể giữ biến của scope ngoài bằng closure.
7. HOF thường ngắn, rõ ý định, dễ compose và ít lỗi index/mutation hơn vòng `for`; `for` vẫn phù hợp khi cần break hoặc tối ưu đặc biệt.
8. Có. Arrow function vẫn là function object nên có thể nhận/trả hàm; chỉ khác ở lexical `this`, không có `arguments` riêng và không dùng được với `new`.
9. Middleware Express, validation, route guard, event handler, retry, logging, `map/filter/reduce`, React hooks. MovieTap dùng callback trong Express middleware, Promise và xử lý danh sách.
10. In `Hello, Alice`. `processUserInput` truyền `"Alice"` vào callback `greet`, rồi trả kết quả.
11. In `[2, 4, 6, 8]`; `map` gọi callback cho từng số và tạo mảng mới.
12. In `48`; accumulator lần lượt là `1*2`, `2*4`, rồi `8*6`.

### Closures

13. Closure là function cùng lexical environment mà nó ghi nhớ, nhờ đó vẫn truy cập được biến bên ngoài sau khi outer function kết thúc.
14. Lexical scope được xác định theo nơi viết code; inner function giữ reference đến các scope cha tại nơi nó được tạo.
15. Scope là quy tắc/phạm vi tìm biến; closure là function thực sự giữ và sử dụng lexical scope đó theo thời gian.
16. Mỗi lần outer function chạy, một lexical environment mới được tạo; inner function được tạo trong lần chạy đó sẽ đóng trên environment tương ứng.
17. Private state, factory function, callback, memoization, event handler, module và cấu hình middleware. `createGracefulShutdown` trong backend MovieTap giữ `server`, `dataSource`, `timeoutMs`.
18. Dữ liệu nằm trong scope của factory, không thể truy cập trực tiếp từ ngoài; chỉ các hàm được trả về mới thao tác được nó.
19. Closure giữ object lớn, DOM node, timer hoặc listener quá lâu có thể ngăn garbage collection và gây memory leak; cần clear timer/remove listener/release reference.
20. Block scope giới hạn biến `let/const` trong `{}`; closure là cơ chế function giữ quyền truy cập scope ngoài, kể cả sau khi scope đó kết thúc.
21. `var` tạo một binding chung ở function scope nên callback thường cùng thấy giá trị cuối; `let` tạo binding mới cho mỗi vòng lặp.
22. Có. Nó tìm biến lần lượt qua toàn bộ lexical scope chain từ gần đến xa.
23. In `1`, `2`, `3`; ba lần gọi cùng cập nhật biến `count` được closure giữ lại.
24. In `3`, `3`, `3`; mọi function dùng cùng binding `var i`, sau vòng lặp `i === 3`.
25. Đổi thành `for (let i = 0; i < 3; i++)`; `let` tạo binding riêng mỗi iteration nên kết quả là `0`, `1`, `2`. Cũng có thể dùng IIFE nhận `i`.
26. Vì `secret` tạo closure giữ reference đến lexical environment chứa `message`; outer function kết thúc không đồng nghĩa environment bị thu hồi.

### Type coercion

27. Type coercion là việc JavaScript chuyển một giá trị từ kiểu này sang kiểu khác.
28. Implicit coercion do toán tử/ngữ cảnh tự chuyển; explicit coercion do lập trình viên gọi `Number`, `String`, `Boolean`…
29. `==` cho phép coercion trước khi so sánh; `===` yêu cầu cùng kiểu và cùng giá trị. Project nên ưu tiên `===`.
30. `"42" * 1` là `42`, vì `*` ép chuỗi sang number.
31. Điều kiện ép giá trị sang boolean theo truthy/falsy.
32. Các falsy value: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Mọi object, kể cả `[]` và `{}`, đều truthy.
33. Object thường gọi `toString`/`valueOf`; object thường thành `"[object Object]"`, array thành chuỗi các phần tử nối bằng dấu phẩy.
34. `Number` chuyển toàn bộ giá trị; `parseInt` đọc số nguyên từ đầu chuỗi; `parseFloat` đọc số thập phân từ đầu chuỗi. `Number("12px")` là `NaN`, `parseInt("12px",10)` là `12`.
35. Nếu có string, `+` thường nối chuỗi; với number thì cộng. Các toán tử số học khác thường ép sang number.
36. Vì quy tắc phụ thuộc ngữ cảnh và có các kết quả khó đoán như `"" == 0`; dùng `===` và conversion rõ ràng để tránh lỗi.
37. In `"53"` rồi `2`; `+` nối chuỗi, `-` ép `"5"` thành `5`.
38. In `true`, `false`; `==` ép `false` thành `0`, còn `===` không ép kiểu.
39. In `true`, `false`; đây là trường hợp đặc biệt của loose equality, nhưng hai giá trị khác kiểu.
40. In `"1,23,4"`; hai array được ép thành `"1,2"` và `"3,4"` rồi nối chuỗi.
41. In `2`, `10`; boolean được ép thành `1` và `0` trong phép cộng số.
42. In `true`, `false`; với `==`, `[]` cuối cùng được ép thành `0`; nhưng bản thân array là truthy nên `![]` là `false`.
43. In `true`; phép nhân cho `6`, sau đó `6 == 6`.
44. Trong `console.log`, cả hai thường in `"[object Object]"`: object/array được ép chuỗi rồi nối. Lưu ý `{}` ở đầu một statement ngoài `console.log` có thể bị parser hiểu là block.
45. In `true`, `false`; `1<2` thành `true` rồi `true<3` tức `1<3`; `3>2` thành `true` rồi `true>1` tức `1>1`.

### Hoisting

46. Hoisting là cách declaration được đăng ký trong environment trước khi phần code thực thi.
47. `var` được hoist và khởi tạo `undefined`; `let/const` được hoist nhưng ở TDZ cho đến declaration, và `const` phải được gán ngay.
48. Function declaration được hoist cả thân hàm; function expression chỉ tuân theo cách hoist của biến chứa nó.
49. Khi tạo execution context, engine lập lexical/variable environment và đăng ký declarations trước execution phase.
50. TDZ là khoảng từ đầu scope tới dòng khai báo `let/const/class`; truy cập trong khoảng này gây `ReferenceError`.
51. Arrow function là expression; nếu gán vào `var` thì biến là `undefined` trước dòng gán, nếu gán `let/const` thì gặp TDZ.
52. `var` là function-scoped; `let/const/class` là block-scoped và có TDZ trong từng block.
53. `var` trả `undefined`; `let/const/class` gây `ReferenceError`; function declaration thường gọi được; biến chưa khai báo hoàn toàn cũng gây `ReferenceError`.
54. Class declaration được hoist về mặt binding nhưng không được khởi tạo trước declaration, nên nằm trong TDZ.
55. Khai báo trước giúp luồng đọc rõ ràng, tránh `undefined`, TDZ và phụ thuộc vào quy tắc hoisting khó thấy.
56. In `undefined`; tương đương khai báo `var a` trước, còn phép gán vẫn ở dòng cũ.
57. `ReferenceError: Cannot access 'b' before initialization` do TDZ.
58. In `Hello!`; function declaration được hoist đầy đủ.
59. Lỗi `TypeError: greet is not a function`; `var greet` là `undefined` tại lúc gọi.
60. In `"undefined"`; `typeof` của binding `var` đã được tạo và có giá trị `undefined`.
61. `ReferenceError` do `x` đang trong TDZ.
62. In `foo called`; function declaration được khởi tạo trước khi chạy, sau đó lệnh `var foo = 10` mới ghi đè.
63. In `undefined`; `var` không có block scope và phép gán chưa chạy.
64. In `undefined`; `num` được hoist lên đầu function với giá trị ban đầu `undefined`.
65. `ReferenceError`; `Person` đang trong TDZ.

### Prototype

66. Prototype là object mà object khác kế thừa property/method; nó cho phép dùng chung method và tiết kiệm bộ nhớ.
67. Nếu property không có trên object, engine tìm ở prototype, rồi prototype của prototype, cho đến `null`.
68. `Constructor.prototype` là object được dùng làm prototype cho instance tạo bởi `new`; `obj.__proto__` là accessor cũ trỏ tới `[[Prototype]]` của một object. Nên dùng `Object.getPrototypeOf`.
69. Engine tìm own property trước, rồi lần lượt đi lên prototype chain; property gần nhất sẽ shadow property phía trên.
70. Prototypal inheritance là object kế thừa trực tiếp từ object khác; classical inheritance mô hình hóa class. JS `class` vẫn chạy trên prototype.
71. `new C()` đặt prototype của instance thành `C.prototype`; method đặt trên đó được dùng chung.
72. `Object.create(proto)` tạo object mới có `[[Prototype]]` là `proto`, không gọi constructor.
73. Sửa property trên object `Constructor.prototype` hiện tại ảnh hưởng instance đang trỏ tới nó; thay cả `Constructor.prototype` chỉ ảnh hưởng instance tạo sau đó.
74. Method instance nằm trên `Class.prototype`, static method nằm trên constructor; `extends` nối cả prototype chain của instance và constructor.
75. Ưu điểm: chia sẻ method, linh hoạt, tiết kiệm bộ nhớ. Nhược điểm: chain/mutation khó theo dõi, shadowing và prototype pollution.

### `this`

76. `this` là context của lời gọi; với regular function nó chủ yếu do call-site quyết định, không phải nơi khai báo.
77. Plain call trong classic script non-strict: `this` là global object; strict mode: `undefined`.
78. Thứ tự ưu tiên thường là `new` > explicit `bind/call/apply` > implicit `obj.method()` > default. Arrow function bỏ qua các luật này và dùng lexical `this`.
79. Trong `obj.method()`, `this` là object ngay trước dấu chấm tại call-site.
80. `call(ctx,a,b)` gọi ngay; `apply(ctx,[a,b])` gọi ngay với array-like arguments; `bind(ctx)` trả function mới để gọi sau.
81. `bind` trả bound function với `this` cố định; truyền context như tham số chỉ là dữ liệu bình thường và function phải tự dùng tham số đó.
82. Arrow function không có `this` riêng mà lấy `this` từ enclosing lexical scope; không đổi bằng `call/apply/bind`.
83. Vì method cần dynamic receiver, còn arrow giữ `this` ngoài nên `obj.arrowMethod()` không tự bind vào `obj`.
84. `new F()` tạo object, đặt prototype, gọi `F` với `this` là object đó và mặc định trả object.
85. Instance method nhận instance khi gọi `obj.m()`; static method nhận class khi gọi `C.m()`; arrow field được tạo riêng cho instance và giữ instance `this`.
86. Detached regular method mất implicit binding; strict mode thường có `this === undefined`, nên truy cập property có thể lỗi.
87. Getter/setter nhận `this` là object receiver mà property đang được đọc/ghi.
88. Regular listener do `addEventListener` gọi thường có `this === currentTarget`; arrow listener giữ lexical `this`.
89. Callback regular function thường mất context; dùng arrow, `bind`, wrapper hoặc tham số `thisArg` của một số array method.
90. Top-level `this` trong ES module là `undefined`; classic browser script là `window`.
91. Có: strict plain call, top-level ES module, hoặc method bị detach rồi gọi như function thường.
92. Hard binding là tạo bound function một lần bằng `bind`; `call/apply` phải chỉ định context ở mỗi lần gọi.
93. Trong derived constructor phải gọi `super()` trước khi dùng `this`; trong method, `super.m()` gọi method cha nhưng giữ `this` là instance hiện tại.
94. Trong classic browser script, `f()` log `window`, `g()` log `undefined`; strict mode không áp default binding sang global.
95. `say()` in `undefined` trong non-strict browser (hoặc có thể lỗi trong strict/module tùy truy cập); `user.say()` in `Steve`. Detached call mất receiver.
96. Cả hai in `15`; `call` và `apply` đặt `this = ctx`, khác cách truyền arguments.
97. `obj.a()` thường trả `undefined` vì arrow lấy top-level `this`; `obj.b()` trả `7`.
98. `m1()` gây `TypeError` vì regular method mất `this`; `m2()` trả `1` vì arrow field giữ lexical instance.
99. Handler #1 in `b`; handler #2 log lexical `this`, trong classic script thường là `window`.
100. Callback regular thường log `undefined` cho `id` (trong browser `this` là `window`); arrow log `T` vì giữ `this` của `start`.
101. `this` là `ul` (`currentTarget`), còn `e.target` là `li`; hữu ích vì một listener trên cha xử lý nhiều phần tử con.
102. In `3`; `inc.call(counter)` tăng `n`, trả đúng `counter`, sau đó `.add(2)` tiếp tục chain trên cùng object.

## Day 2 – JavaScript ES6

1. Global scope dùng toàn chương trình; function scope dùng trong function; block scope dùng trong `{}`. `let`, `const`, `class` là block-scoped; `var` là function/global-scoped.
2. `var` hoist và khởi tạo `undefined`; `let/const` hoist nhưng ở TDZ đến declaration.
3. Dùng `const` mặc định, `let` khi cần reassign. `const` chỉ khóa binding, không làm object bất biến.
4. `var` cho redeclare và reassign; `let` không redeclare cùng scope nhưng reassign được; `const` không redeclare/reassign và phải khởi tạo.
5. Arrow không có `this`, `arguments`, `super`, `new.target` riêng mà lấy từ scope ngoài; regular function có context theo lời gọi.
6. Không; arrow không có `[[Construct]]` và không có `prototype`, nên `new` gây `TypeError`.
7. Default được đánh giá lúc gọi, từ trái sang phải; chỉ áp dụng với `undefined`/thiếu argument, không áp dụng cho `null`.
8. Có: `function f(a=1,b=a+1,c=getValue()) {}`; chỉ tham chiếu an toàn đến parameter đứng trước.
9. Rest là array thật, chỉ chứa phần dư và dùng được với arrow; `arguments` là array-like của mọi argument và không có riêng trong arrow.
10. Spread dùng copy/merge array-object, truyền arguments, chèn phần tử, chuyển iterable. Nó chỉ shallow copy.
11. Array destructuring hỗ trợ bỏ vị trí bằng dấu phẩy, default cho `undefined`, rest ở cuối và pattern lồng nhau.
12. Object destructuring hỗ trợ rename (`a:x`), default, nested pattern, rest và computed key (`[key]: value`).
13. Template literal hỗ trợ multiline và `${expression}`; tagged template nhận phần tĩnh/giá trị. Tag phải escape đúng context, không tự động bảo vệ khỏi XSS/SQL injection.
14. Class có constructor, field, method, static, getter/setter, `extends`, `super`; method dùng prototype.
15. Class là syntax trên prototype nhưng strict mặc định; class declaration có TDZ, không gọi được trước declaration như function declaration.
16. Import là live read-only binding; export `const` không thể reassign trong module khai báo; module bindings cũng tuân lexical scope/TDZ.
17. `for...of` duyệt value của iterable (array/string/Map/Set); `for...in` duyệt enumerable property keys, không nên dùng cho array; object thường dùng `Object.keys/entries`.
18. `const` vẫn cho sửa nested data. Có thể dùng immutable update, `Object.freeze`; deep freeze cần đệ quy/thư viện và vẫn có giới hạn.
19. Spread object/array lớn tạo copy và tốn bộ nhớ; destructuring sâu làm code khó đọc. Tránh `{...acc}` trong mỗi vòng `reduce` khi dữ liệu lớn.
20. In `undefined`, sau đó dừng với `ReferenceError` ở `y`; `var x` được khởi tạo, `let y` ở TDZ.
21. Có, `SyntaxError`; `var n` và lexical `const n` xung đột trong cùng block/function environment.
22. Ba callback `var` in `var 3`; callbacks `let` in `let 0`, `let 1`, `let 2`, vì `let` có binding riêng mỗi iteration.
23. `TypeError: A is not a constructor`.
24. In `6`; spread tách `[1,2,3]` thành arguments, rest gom lại thành `nums`, `reduce` cộng chúng.
25. In `99 [1, 2]`; spread chỉ shallow copy nên nested object và array vẫn dùng chung reference.
26. In `1 0`; `undefined` kích hoạt default cho `x`, phần tử `9` bị bỏ, `0` không kích hoạt default của `y`.
27. In `10 99`; `first=10`, bỏ `20`, phần tử thứ ba thiếu nên dùng default.
28. In `Hi Guest Hi Bao`.
29. Có. `const { [key]: v } = obj` lấy property tên `"k"` nên in `1`.
30. In `0 4 true`; `more=[0,1,2,3,4]`, `first=0`, `rest` có bốn phần tử và chứa `3`.
31. In `localhost:3000 localhost:80`.
32. In `0`; `obj.inc` bị detach và callback gọi không có `obj` làm receiver, nên `obj.x` không tăng.
33. In `3000 0`; `||` dùng default cho mọi falsy value, `??` chỉ cho `null/undefined`.
34. In `[1,2,3]` rồi `{}`; Set iterable spread được vào array, Map không có enumerable own properties để object spread.
35. Object là `{a:3,b:2}` vì key sau ghi đè; sau đó in `3 {b:2}`.
36. In `none none 1`; nested defaults tránh lỗi khi thiếu `a`, `??` đổi `undefined` thành `"none"`.
37. `ReferenceError`; parameter `value` ở TDZ trong chính default-parameter scope, nên vế phải không lấy được biến ngoài cùng tên.
38. In `1`; property `x` không tồn tại nên default destructuring được dùng.
39. In `false 7`; private field không phải string property `"#k"`, nhưng method trong class truy cập được `this.#k`.

## Day 3 – JavaScript Asynchronous

1. Async programming cho phép bắt đầu tác vụ chậm và tiếp tục xử lý việc khác thay vì chặn luồng.
2. JS code chạy một thread, còn browser/Node APIs xử lý timer, I/O; callback được event loop đưa trở lại JS khi sẵn sàng.
3. Event loop kiểm tra call stack và chuyển task/microtask đã sẵn sàng vào thực thi.
4. Sync chạy tuần tự và chặn đến khi xong; async trả quyền điều khiển trước, kết quả đến sau qua callback/Promise/event.
5. Callback chỉ được lấy từ queue khi call stack rỗng; microtask được xử lý trước task tiếp theo.
6. Promise callbacks là microtasks và được drain sau stack hiện tại; timer là macrotask, chạy ở vòng event loop sau.
7. `setTimeout` đăng ký timer; hết thời gian callback mới đủ điều kiện vào queue, còn phải chờ stack và task trước đó nên delay là tối thiểu.
8. `setTimeout` chạy một lần; `setInterval` lập lịch lặp. Chuỗi recursive `setTimeout` thường kiểm soát khoảng nghỉ tốt hơn.
9. Giữ ID và gọi `clearTimeout(id)` hoặc `clearInterval(id)`.
10. Promise đại diện kết quả tương lai, chuẩn hóa success/error và chaining, giúp tránh callback hell.
11. Promise bắt đầu `pending`, chuyển một lần sang `fulfilled` hoặc `rejected`, rồi giữ trạng thái đó.
12. `.then` xử lý fulfillment, `.catch` xử lý rejection, `.finally` luôn chạy để cleanup và thường truyền nguyên outcome.
13. Quên `return` Promise, không `await`, nuốt lỗi trong `catch`, lồng `.then` không cần thiết, dùng `forEach(async...)`, hoặc tạo Promise thủ công thừa.
14. `all`: tất cả thành công hoặc fail-fast; `allSettled`: đợi tất cả; `race`: outcome đầu tiên; `any`: fulfillment đầu tiên, reject `AggregateError` nếu tất cả reject.
15. `fetch` gửi HTTP request và trả `Promise<Response>`; HTTP 4xx/5xx không tự reject, cần kiểm tra `response.ok`.
16. Fetch dùng Promise và API gọn/stream-friendly; XHR dùng event/callback và hỗ trợ progress upload lâu đời hơn.
17. Response body là stream; `.json()` đọc bất đồng bộ và parse stream thành object.
18. `async/await` làm chuỗi Promise giống code tuần tự, dễ dùng `try/catch/finally`. MovieTap controllers/services dùng kiểu này nhiều.
19. In `A`, `D`, `C`, `B`; sync trước, Promise microtask trước timer macrotask.
20. In `Done`, rồi `Timeout`; vòng lặp chặn thread nên timer phải chờ dù delay là `0`.
21. In `1`, `2`, `3`, mỗi giá trị cách khoảng một giây rồi interval bị hủy.
22. In `42`; lỗi ở `.then` chuyển chain sang rejected, `.catch` phục hồi bằng `42`.
23. In `Start`, `End`, khoảng một giây sau `After 1s`.
24. Không xác định thứ tự chính xác giữa hai kết quả vì có hai request độc lập; mỗi response được parse rồi dữ liệu được log. Nếu request lỗi hoặc JSON lỗi mà không có `catch`, sẽ có unhandled rejection.

## Day 4 – Web Storage and npm

### npm

1. npm là package manager của Node.js; CLI hỗ trợ cài/gỡ/cập nhật dependency, chạy scripts, audit và publish.
2. `npx` chạy binary từ dependency local hoặc package tạm thời; `npm` chủ yếu quản lý package và scripts.
3. nvm quản lý nhiều phiên bản Node và cho chuyển version theo project.
4. `package.json` chứa metadata, scripts, dependency ranges và cấu hình project. MovieTap có file riêng cho frontend/backend.
5. `package-lock.json` khóa cây dependency chính xác cùng integrity hash, được npm cập nhật khi cài đặt.
6. `package.json` mô tả ý định/range trực tiếp; lock file ghi phiên bản chính xác của toàn bộ cây transitive.
7. Lock file giúp máy dev và CI cài cùng dependency tree; MovieTap dùng `npm ci` trong CI.
8. Dùng `npx` cho CLI dùng một lần/theo version project, tránh cài global và xung đột phiên bản.
9. nvm cho mỗi project dùng Node phù hợp; MovieTap backend yêu cầu Node >=24, frontend >=18.
10. Sửa tay dễ làm sai integrity/tree; nên để `npm install` tái tạo nhất quán.
11. `^4.17.1` cho phép `>=4.17.1 <5.0.0`; lock file vẫn quyết định bản chính xác đã khóa.
12. `npx` tìm `serverless` trong `node_modules/.bin`; nếu không có, nó có thể tải package tạm để chạy mà không cần global install.
13. Thường chạy `npm install` để đồng bộ. Muốn tái tạo: xóa có chủ đích `node_modules` và `package-lock.json`, rồi `npm install`; cần review thay đổi vì có thể nâng nhiều dependency.
14. Range như `^1.2.0` có thể resolve ra patch/minor khác theo ngày; lock file khóa cả direct và transitive versions nên mọi người nhận cùng cây.
15. `npm ci` fail nếu hai file lệch và không sửa lock; `npm install` cố resolve rồi cập nhật lock. Failure có thể là build khác nhau, dependency mới không tương thích hoặc CI fail.
16. `npm init -y` tạo `package.json`; `npm install lodash` cập nhật dependencies trong `package.json`, tạo/cập nhật lock với cây chính xác và tạo `node_modules`.

### Web Storage và cookies

17. `localStorage` tồn tại theo origin qua lần đóng trình duyệt; `sessionStorage` tồn tại theo tab/session; cookie nhỏ hơn và có thể tự gửi lên server.
18. Web Storage chủ yếu lưu trạng thái client; cookie thường dùng cho session/server communication.
19. `localStorage` đến khi bị xóa; `sessionStorage` đến khi tab đóng; cookie đến `Expires/Max-Age`, hoặc hết browser session nếu là session cookie.
20. local/session storage theo origin (scheme+host+port), session còn tách theo tab; cookie theo domain/path, chỉ gửi trên scheme phù hợp và quy tắc SameSite.
21. Cookie khoảng 4 KB mỗi cookie; Web Storage thường khoảng 5–10 MB mỗi origin, tùy browser.
22. Cookie phù hợp điều kiện sẽ tự gửi trong HTTP request; local/session storage không tự gửi.
23. `setItem(k,v)`, `getItem(k)`, `removeItem(k)`, `clear()` trên `localStorage` hoặc `sessionStorage`.
24. Tạo: `document.cookie="theme=dark; Path=/; SameSite=Lax"`; đọc qua `document.cookie`; xóa bằng cùng name/path với `Max-Age=0`. JavaScript không thể tạo cookie `HttpOnly`.
25. Web Storage lưu string; dùng `JSON.stringify(obj)` khi ghi và `JSON.parse(value)` khi đọc, có xử lý `null`/parse error.
26. Script chạy trong origin có thể đọc token, nên XSS có thể đánh cắp token; sessionStorage chỉ giảm thời gian tồn tại, không loại bỏ XSS.
27. `HttpOnly` chặn JS đọc, `Secure` chỉ gửi HTTPS, `SameSite` giảm CSRF; server nên thêm `Path`, expiry phù hợp.
28. UI preference lâu dài: localStorage; dữ liệu chỉ trong tab: sessionStorage; session/token cần server nhận và cần chống trộm qua JS: Secure HttpOnly SameSite cookie.
29. `localStorage.setItem("theme","dark"); const theme=localStorage.getItem("theme") || "light";`
30. `sessionStorage.setItem("formStep","2"); const formStep=Number(sessionStorage.getItem("formStep") || 1);`
31. Ưu tiên server tạo cookie: `res.cookie("refreshToken", token, {httpOnly:true, secure:true, sameSite:"lax", path:"/api/auth", maxAge:604800000});`. MovieTap dùng access token phía client và refresh cookie; refresh token nên luôn là HttpOnly cookie.
32. `sessionStorage.setItem("filters",JSON.stringify(filters)); const filters=JSON.parse(sessionStorage.getItem("filters") || "{}");`
33. localStorage đơn giản nhất cho preference không nhạy cảm trên một thiết bị; cookie hữu ích nếu server cần ngôn ngữ ngay ở request; server-side tốt nhất khi cần đồng bộ nhiều thiết bị cho user đăng nhập.
34. `if(localStorage.getItem("consentGiven")!=="true") showBanner();` Khi đồng ý: `localStorage.setItem("consentGiven","true"); hideBanner();`.

## Day 5 – TypeScript

> Project MovieTap hiện dùng `.js/.jsx`, không có TypeScript. Các đáp án sau là kiến thức TypeScript độc lập.

1. Kiểu cơ bản gồm `string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`; TS thêm `any`, `unknown`, `never`, `void`, tuple, enum, union… Các type bị xóa khi compile sang JS.
2. Type inference suy kiểu từ giá trị khởi tạo, context, return và control flow; ví dụ `let n=1` suy ra `number`.
3. `interface` hỗ trợ declaration merging và `extends`; `type` hỗ trợ union, tuple, primitive alias và intersection. Cả hai mô tả object được.
4. Dùng inline type, `type` hoặc `interface`, ví dụ `{id:number; name?:string}`.
5. Encapsulation ẩn trạng thái; inheritance kế thừa; polymorphism dùng chung contract với implementation khác; abstraction nêu contract qua interface/abstract class.
6. `public` ở mọi nơi; `protected` trong class và subclass; `private` chỉ trong class khai báo. Đây chủ yếu là kiểm tra compile-time; `#field` mới là private runtime JS.
7. `readonly` chỉ cho gán lúc khai báo/constructor; `static` thuộc class chứ không thuộc instance.
8. Abstract class không khởi tạo trực tiếp, có thể chứa implementation và abstract member bắt subclass triển khai.
9. Generic dùng type parameter như `T` để tái sử dụng mà vẫn giữ quan hệ kiểu, ví dụ `identity<T>(x:T):T`.
10. `any` bỏ kiểm tra; `unknown` buộc narrow trước khi dùng; `never` biểu diễn giá trị không bao giờ tồn tại/đường code không hoàn tất.
11. `type Fn=(a:number)=>number`; `interface Fn { (a:number):number }`.
12. Enum là tập constant có tên; dùng khi tập giá trị đóng. Nhiều codebase ưu tiên string-literal union vì output nhẹ hơn.
13. Numeric enum tự tăng và có reverse mapping; string enum dùng string rõ nghĩa; `const enum` thường inline khi compile và có hạn chế tooling/module.
14. Structural typing xét hình dạng member, không bắt buộc cùng tên type/class.
15. Override phải tương thích contract của base class; dùng từ khóa `override` cùng `noImplicitOverride` để compiler kiểm tra rõ hơn.
16. Ví dụ `let x=10` được suy là `number`; `const x=10` thường có literal type `10` tùy context.
17. Type alias mở rộng bằng intersection `&`; interface dùng `extends` và có thể merge declaration.
18. `type User={id:number; name:string; email?:string}`: `id/name` bắt buộc, `email` tùy chọn.
19. `private secret` không dùng trong subclass; `protected token` dùng được trong subclass nhưng không truy cập từ instance bên ngoài.
20. `readonly id` gán trong constructor được; gán lại `p.id=20` gây compile error.
21. `abstract class Shape { abstract area():number } class Circle extends Shape { area(){return 1} }`; subclass cụ thể phải implement `area`.
22. `type Add=(a:number,b:number)=>number; interface IAdd{(a:number,b:number):number}; const add:Add=(a,b)=>a+b; const add2:IAdd=add;`.
23. `function identity<T>(value:T):T{return value}`; truyền number trả number, truyền string trả string.
24. `interface Repository<T>{add(item:T):void;remove(id:number):void;find(id:number):T|undefined}`; chọn `Repository<User>` thì `add/find` phải dùng `User`.
25. `enum Role{Admin,Editor,Viewer}; if(role===Role.Admin){...}`; chỉ nhận value thuộc `Role`.
26. Nếu subclass đổi return/parameter không tương thích base contract, compiler báo lỗi; return covariant hợp lệ trong giới hạn type system.
27. Không gán `unknown` thẳng cho `string`; narrow: `if(typeof value==="string"){str=value}` hoặc assertion khi có bằng chứng.
28. `num` được suy là `number` vì khai báo bằng `let`; không phải literal type cố định `42`.
29. `ExtendedAlias` dùng intersection `Alias & {...}`; `ExtendedIAlias` dùng `extends`. Kết quả shape tương tự nhưng interface hỗ trợ declaration merging.
30. Dấu `?` cho phép thiếu `name`; khi đọc, kiểu là `string | undefined`, nên phải kiểm tra/default trước thao tác chỉ dành cho string.
31. `secret` là private của `Base`; `token` protected nên `Derived` dùng được, nhưng code ngoài class/subclass không được.
32. `p.id=20` gây compile-time error: cannot assign to readonly property.
33. `Circle` không abstract nên phải implement abstract `area`; `c.area()` trả `Math.PI*25`, khoảng `78.53981633974483`.
34. Cả type alias và interface đều tạo call signature nhận hai number và trả number; function sai parameter/return sẽ bị compiler từ chối.
35. `a` suy là `number`, `b` suy là `string` (trong context generic này có thể giữ literal type cụ thể tùy phiên bản/context, nhưng đều gán an toàn cho number/string tương ứng).
36. `T` liên kết kiểu item đầu vào và kết quả; `Repository<User>` không cho `add(Product)` và `find` trả `User | undefined`.
37. `canEdit(Role.Viewer)` trả `false`.
38. In `"woof"`; runtime dispatch gọi override trên object thực là `Dog`, dù biến được khai báo kiểu `Animal`.
39. Vì `unknown` có thể là bất kỳ kiểu nào và chưa được chứng minh là string. Sửa bằng `if(typeof value==="string"){str=value}` hoặc assertion `value as string` khi chắc chắn.
