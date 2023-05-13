class ParseSQL {
  query: string;

  constructor(query: string) {
    this.query = query;
  }

  astify(): { sql: string; offset: null | number; limit: null | number } {
    const parsed: any = {
      offset: null,
      limit: null,
    };

    const limitRegex = /LIMIT\s+(\d+)/i;
    const offsetRegex = /OFFSET\s+(\d+)/i;

    const limitMatch = this.query.match(limitRegex);
    if (limitMatch) {
      parsed.limit = parseInt(limitMatch[1], 10);
      this.query = this.query.replace(limitRegex, '');
    }

    const offsetMatch = this.query.match(offsetRegex);
    if (offsetMatch) {
      parsed.offset = parseInt(offsetMatch[1], 10);
      this.query = this.query.replace(offsetRegex, '');
    }

    return { query: this.query, ...parsed };
  }

  removeLimit(): string {
    return this.query.replace(/LIMIT\s+\d+\s*(OFFSET\s+\d+)?/gi, '');
  }
}
