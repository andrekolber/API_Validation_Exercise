process.env.NODE_ENV = 'test';

const request = require('supertest');
const db = require('../db');

let book_isbn;

beforeEach(async () => {
	let results = await db.query(`
        INSERT INTO books
        (isbn, amazon_url, author, language, pages, publisher, title, year)
        VALUES ('12341234', 
        'https://amazon.com/taco', 
        'Elie',
        'English',
        100,
        'Nothing publishers',
        'my first book',
        2008)
        RETURNING isbn
    `);

	book_isbn = results.rows[0].isbn;
});

describe('POST /books', () => {
	test('Creates a new book', async () => {
		const response = await request(app).post('/books').send({
			isbn       : '32794782',
			amazon_url : 'https://taco.com',
			author     : 'mctest',
			language   : 'english',
			pages      : 1000,
			publisher  : 'yeah right',
			title      : 'amazing times',
			year       : 2000,
		});
		expect(response.statusCode).toBe(201);
		expect(response.body.book).toHaveProperty('isbn');
	});

	test('Prevents creating book without required title', async () => {
		const response = await request(app).post('books').send({ year: 2000 });
		expect(response.statusCode).toBe(400);
	});
});

describe('GET /books', () => {
	test('Gets a single book', async () => {
		const response = await request(app).get(`/books`);
		const books = response.body.books;
		expect(books).toHaveLength(1);
		expect(books[0]).toHaveProperty('isbn');
		expect(books[0]).toHaveProperty('amazon_url');
	});
});

describe('GET /books/:isbn', () => {
	test('Gets a single book', async () => {
		const response = await request(app).get(`/books/${book_isbn}`);
		expect(response.body.book).toHaveProperty('isbn');
		expect(response.body.book.isbn).toBe(book_isbn);
	});

	test("Responds with 404 if can't find book in question", async function() {
		const response = await request(app).get(`/books/999`);
		expect(response.statusCode).toBe(404);
	});
});

describe('PUT /books/:isbn', () => {
	test('Updates a single book', async function() {
		const response = await request(app).put(`/books/${book_isbn}`).send({
			amazon_url : 'https://taco.com',
			author     : 'mctest',
			language   : 'english',
			pages      : 1000,
			publisher  : 'yeah right',
			title      : 'UPDATED BOOK',
			year       : 2000,
		});
		expect(response.body.book).toHaveProperty('isbn');
		expect(response.body.book.title).toBe('UPDATED BOOK');
	});

	test("Responds 404 if can't find book in question", async function() {
		await request(app).delete(`/books/${book_isbn}`);
		const response = await request(app).delete(`/books/${book_isbn}`);
		expect(response.statusCode).toBe(404);
	});

	test('Prevents a bad book update', async () => {
		const response = await (await request(app).put(`/books/${book_isbn}`)).setEncoding({
			isbn       : '32794782',
			badField   : 'DO NOT ADD ME!',
			amazon_url : 'https://taco.com',
			author     : 'mctest',
			language   : 'english',
			pages      : 1000,
			publisher  : 'yeah right',
			title      : 'UPDATED BOOK',
			year       : 2000,
		});
		expect(response.status).toBe(400);
	});
});

describe('DELETE /books/:isbn', () => {
	test('Deletes a single book', async () => {
		const response = await request(app).delete(`/books/${book_isbn}`);
		expect(response.body).toEqual({ message: 'Book deleted' });
	});
});

afterEach(async () => {
	await db.query('DELETE FROM BOOKS');
});

afterAll(async () => {
	await db.end();
});
