--
-- PostgreSQL database dump
--

\restrict pFRFLYRGEkYtYjNRDCzNrUBMljycuJS78Ot4z9g2gNsiuhGRtzC3DL2cdvvVKGA

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: Action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Action" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);


ALTER TYPE public."Action" OWNER TO postgres;

--
-- Name: KategoriSarana; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."KategoriSarana" AS ENUM (
    'SPAL',
    'SAB',
    'JAMBAN'
);


ALTER TYPE public."KategoriSarana" OWNER TO postgres;

--
-- Name: KategoriTtu; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."KategoriTtu" AS ENUM (
    'PRIORITAS',
    'NON_PRIORITAS'
);


ALTER TYPE public."KategoriTtu" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'OPERATOR'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: StatusLaporan; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StatusLaporan" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED'
);


ALTER TYPE public."StatusLaporan" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: InspectionField; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InspectionField" (
    id integer NOT NULL,
    "templateId" integer NOT NULL,
    pertanyaan text NOT NULL,
    tipe text NOT NULL,
    options text,
    "isRequired" boolean DEFAULT true NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    config jsonb,
    grup text
);


ALTER TABLE public."InspectionField" OWNER TO postgres;

--
-- Name: InspectionField_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."InspectionField_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."InspectionField_id_seq" OWNER TO postgres;

--
-- Name: InspectionField_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."InspectionField_id_seq" OWNED BY public."InspectionField".id;


--
-- Name: InspectionResult; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InspectionResult" (
    id integer NOT NULL,
    "templateId" integer NOT NULL,
    "puskesmasId" integer NOT NULL,
    "userId" integer NOT NULL,
    "namaSasaran" text NOT NULL,
    "alamatSasaran" text,
    lat double precision,
    lng double precision,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    catatan text,
    bulan integer DEFAULT 0 NOT NULL,
    tahun integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "fotoPaths" jsonb DEFAULT '[]'::jsonb,
    "signatureData" jsonb
);


ALTER TABLE public."InspectionResult" OWNER TO postgres;

--
-- Name: InspectionResultValue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InspectionResultValue" (
    id integer NOT NULL,
    "resultId" integer NOT NULL,
    "fieldId" integer NOT NULL,
    "valueString" text,
    "valueNumber" double precision,
    "valueJson" jsonb
);


ALTER TABLE public."InspectionResultValue" OWNER TO postgres;

--
-- Name: InspectionResultValue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."InspectionResultValue_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."InspectionResultValue_id_seq" OWNER TO postgres;

--
-- Name: InspectionResultValue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."InspectionResultValue_id_seq" OWNED BY public."InspectionResultValue".id;


--
-- Name: InspectionResult_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."InspectionResult_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."InspectionResult_id_seq" OWNER TO postgres;

--
-- Name: InspectionResult_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."InspectionResult_id_seq" OWNED BY public."InspectionResult".id;


--
-- Name: InspectionTemplate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."InspectionTemplate" (
    id integer NOT NULL,
    nama text NOT NULL,
    deskripsi text,
    "isActive" boolean DEFAULT true NOT NULL,
    "puskesmasId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "subCategoryId" integer
);


ALTER TABLE public."InspectionTemplate" OWNER TO postgres;

--
-- Name: InspectionTemplate_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."InspectionTemplate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."InspectionTemplate_id_seq" OWNER TO postgres;

--
-- Name: InspectionTemplate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."InspectionTemplate_id_seq" OWNED BY public."InspectionTemplate".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    action public."Action" NOT NULL,
    "tableName" text NOT NULL,
    "recordId" integer NOT NULL,
    "oldData" jsonb,
    "newData" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: changelog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.changelog (
    id integer NOT NULL,
    "tableName" text NOT NULL,
    "recordId" integer NOT NULL,
    "userId" integer NOT NULL,
    field text NOT NULL,
    "oldValue" text,
    "newValue" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.changelog OWNER TO postgres;

--
-- Name: changelog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.changelog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.changelog_id_seq OWNER TO postgres;

--
-- Name: changelog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.changelog_id_seq OWNED BY public.changelog.id;


--
-- Name: dynamic_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dynamic_category (
    id integer NOT NULL,
    nama text NOT NULL,
    code text NOT NULL,
    deskripsi text,
    icon text DEFAULT '📋'::text NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    "isRowBased" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.dynamic_category OWNER TO postgres;

--
-- Name: dynamic_category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dynamic_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dynamic_category_id_seq OWNER TO postgres;

--
-- Name: dynamic_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dynamic_category_id_seq OWNED BY public.dynamic_category.id;


--
-- Name: dynamic_compliance_formula; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dynamic_compliance_formula (
    id integer NOT NULL,
    "categoryId" integer NOT NULL,
    "numeratorCode" text NOT NULL,
    "denominatorCode" text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.dynamic_compliance_formula OWNER TO postgres;

--
-- Name: dynamic_compliance_formula_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dynamic_compliance_formula_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dynamic_compliance_formula_id_seq OWNER TO postgres;

--
-- Name: dynamic_compliance_formula_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dynamic_compliance_formula_id_seq OWNED BY public.dynamic_compliance_formula.id;


--
-- Name: dynamic_laporan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dynamic_laporan (
    id integer NOT NULL,
    "puskesmasId" integer NOT NULL,
    "categoryId" integer NOT NULL,
    bulan integer NOT NULL,
    tahun integer NOT NULL,
    status public."StatusLaporan" DEFAULT 'DRAFT'::public."StatusLaporan" NOT NULL,
    catatan text,
    "createdBy" integer,
    "updatedBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.dynamic_laporan OWNER TO postgres;

--
-- Name: dynamic_laporan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dynamic_laporan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dynamic_laporan_id_seq OWNER TO postgres;

--
-- Name: dynamic_laporan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dynamic_laporan_id_seq OWNED BY public.dynamic_laporan.id;


--
-- Name: dynamic_laporan_value; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dynamic_laporan_value (
    id integer NOT NULL,
    "laporanId" integer NOT NULL,
    "parameterId" integer NOT NULL,
    "subCategoryId" integer,
    value text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.dynamic_laporan_value OWNER TO postgres;

--
-- Name: dynamic_laporan_value_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dynamic_laporan_value_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dynamic_laporan_value_id_seq OWNER TO postgres;

--
-- Name: dynamic_laporan_value_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dynamic_laporan_value_id_seq OWNED BY public.dynamic_laporan_value.id;


--
-- Name: dynamic_parameter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dynamic_parameter (
    id integer NOT NULL,
    "categoryId" integer NOT NULL,
    nama text NOT NULL,
    code text NOT NULL,
    type text DEFAULT 'NUMBER'::text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    config jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isBaseline" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.dynamic_parameter OWNER TO postgres;

--
-- Name: dynamic_parameter_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dynamic_parameter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dynamic_parameter_id_seq OWNER TO postgres;

--
-- Name: dynamic_parameter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dynamic_parameter_id_seq OWNED BY public.dynamic_parameter.id;


--
-- Name: dynamic_sub_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dynamic_sub_category (
    id integer NOT NULL,
    "categoryId" integer NOT NULL,
    nama text NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    grup text
);


ALTER TABLE public.dynamic_sub_category OWNER TO postgres;

--
-- Name: dynamic_sub_category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dynamic_sub_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dynamic_sub_category_id_seq OWNER TO postgres;

--
-- Name: dynamic_sub_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dynamic_sub_category_id_seq OWNED BY public.dynamic_sub_category.id;


--
-- Name: dynamic_target; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dynamic_target (
    id integer NOT NULL,
    tahun integer NOT NULL,
    "categoryId" integer NOT NULL,
    "puskesmasId" integer,
    "targetPersen" double precision DEFAULT 80.0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.dynamic_target OWNER TO postgres;

--
-- Name: dynamic_target_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dynamic_target_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dynamic_target_id_seq OWNER TO postgres;

--
-- Name: dynamic_target_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dynamic_target_id_seq OWNED BY public.dynamic_target.id;


--
-- Name: jenis_sarana; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jenis_sarana (
    id integer NOT NULL,
    nama text NOT NULL,
    kategori public."KategoriSarana" NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.jenis_sarana OWNER TO postgres;

--
-- Name: jenis_sarana_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jenis_sarana_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jenis_sarana_id_seq OWNER TO postgres;

--
-- Name: jenis_sarana_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jenis_sarana_id_seq OWNED BY public.jenis_sarana.id;


--
-- Name: jenis_tpp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jenis_tpp (
    id integer NOT NULL,
    nama text NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.jenis_tpp OWNER TO postgres;

--
-- Name: jenis_tpp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jenis_tpp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jenis_tpp_id_seq OWNER TO postgres;

--
-- Name: jenis_tpp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jenis_tpp_id_seq OWNED BY public.jenis_tpp.id;


--
-- Name: jenis_ttu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jenis_ttu (
    id integer NOT NULL,
    nama text NOT NULL,
    kategori public."KategoriTtu" NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.jenis_ttu OWNER TO postgres;

--
-- Name: jenis_ttu_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jenis_ttu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jenis_ttu_id_seq OWNER TO postgres;

--
-- Name: jenis_ttu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jenis_ttu_id_seq OWNED BY public.jenis_ttu.id;


--
-- Name: laporan_jamban; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laporan_jamban (
    id integer NOT NULL,
    "puskesmasId" integer NOT NULL,
    bulan integer NOT NULL,
    tahun integer NOT NULL,
    "jenisSaranaId" integer NOT NULL,
    jumlah integer DEFAULT 0 NOT NULL,
    kk integer DEFAULT 0 NOT NULL,
    pddk integer DEFAULT 0 NOT NULL,
    "diperiksaJumlah" integer DEFAULT 0 NOT NULL,
    "diperiksaMs" integer DEFAULT 0 NOT NULL,
    "diperiksaKk" integer DEFAULT 0 NOT NULL,
    "diperiksaPddk" integer DEFAULT 0 NOT NULL,
    status public."StatusLaporan" DEFAULT 'DRAFT'::public."StatusLaporan" NOT NULL,
    catatan text,
    "createdBy" integer,
    "updatedBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.laporan_jamban OWNER TO postgres;

--
-- Name: laporan_jamban_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.laporan_jamban_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.laporan_jamban_id_seq OWNER TO postgres;

--
-- Name: laporan_jamban_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.laporan_jamban_id_seq OWNED BY public.laporan_jamban.id;


--
-- Name: laporan_rumah; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laporan_rumah (
    id integer NOT NULL,
    "puskesmasId" integer NOT NULL,
    bulan integer NOT NULL,
    tahun integer NOT NULL,
    "jumlahRumahAda" integer DEFAULT 0 NOT NULL,
    "jumlahDiperiksa" integer DEFAULT 0 NOT NULL,
    "ventilasiMs" integer DEFAULT 0 NOT NULL,
    "ventilasiTms" integer DEFAULT 0 NOT NULL,
    "peneranganMs" integer DEFAULT 0 NOT NULL,
    "peneranganTms" integer DEFAULT 0 NOT NULL,
    "lantaiMs" integer DEFAULT 0 NOT NULL,
    "lantaiTms" integer DEFAULT 0 NOT NULL,
    "kepadatanHuniMs" integer DEFAULT 0 NOT NULL,
    "kepadatanHuniTms" integer DEFAULT 0 NOT NULL,
    "lubangAsapMs" integer DEFAULT 0 NOT NULL,
    "lubangAsapTms" integer DEFAULT 0 NOT NULL,
    "jambanMs" integer DEFAULT 0 NOT NULL,
    "jambanTms" integer DEFAULT 0 NOT NULL,
    "airBersihMs" integer DEFAULT 0 NOT NULL,
    "airBersihTms" integer DEFAULT 0 NOT NULL,
    "airLimbahMs" integer DEFAULT 0 NOT NULL,
    "airLimbahTms" integer DEFAULT 0 NOT NULL,
    "sampahMs" integer DEFAULT 0 NOT NULL,
    "sampahTms" integer DEFAULT 0 NOT NULL,
    "kandangMs" integer DEFAULT 0 NOT NULL,
    "kandangTms" integer DEFAULT 0 NOT NULL,
    "kandangTidakAda" integer DEFAULT 0 NOT NULL,
    "hasilMs" integer DEFAULT 0 NOT NULL,
    "hasilTms" integer DEFAULT 0 NOT NULL,
    status public."StatusLaporan" DEFAULT 'DRAFT'::public."StatusLaporan" NOT NULL,
    catatan text,
    "createdBy" integer,
    "updatedBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.laporan_rumah OWNER TO postgres;

--
-- Name: laporan_rumah_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.laporan_rumah_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.laporan_rumah_id_seq OWNER TO postgres;

--
-- Name: laporan_rumah_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.laporan_rumah_id_seq OWNED BY public.laporan_rumah.id;


--
-- Name: laporan_sab; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laporan_sab (
    id integer NOT NULL,
    "puskesmasId" integer NOT NULL,
    bulan integer NOT NULL,
    tahun integer NOT NULL,
    "jenisSaranaId" integer NOT NULL,
    jumlah integer DEFAULT 0 NOT NULL,
    kk integer DEFAULT 0 NOT NULL,
    pddk integer DEFAULT 0 NOT NULL,
    "diperiksaJumlah" integer DEFAULT 0 NOT NULL,
    "diperiksaMs" integer DEFAULT 0 NOT NULL,
    "diperiksaKk" integer DEFAULT 0 NOT NULL,
    "diperiksaPddk" integer DEFAULT 0 NOT NULL,
    "inspeksiR" integer DEFAULT 0 NOT NULL,
    "inspeksiS" integer DEFAULT 0 NOT NULL,
    "inspeksiT" integer DEFAULT 0 NOT NULL,
    "inspeksiAt" integer DEFAULT 0 NOT NULL,
    status public."StatusLaporan" DEFAULT 'DRAFT'::public."StatusLaporan" NOT NULL,
    catatan text,
    "createdBy" integer,
    "updatedBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.laporan_sab OWNER TO postgres;

--
-- Name: laporan_sab_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.laporan_sab_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.laporan_sab_id_seq OWNER TO postgres;

--
-- Name: laporan_sab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.laporan_sab_id_seq OWNED BY public.laporan_sab.id;


--
-- Name: laporan_spal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laporan_spal (
    id integer NOT NULL,
    "puskesmasId" integer NOT NULL,
    bulan integer NOT NULL,
    tahun integer NOT NULL,
    "jenisSaranaId" integer NOT NULL,
    jumlah integer DEFAULT 0 NOT NULL,
    kk integer DEFAULT 0 NOT NULL,
    pddk integer DEFAULT 0 NOT NULL,
    "diperiksaJumlah" integer DEFAULT 0 NOT NULL,
    "diperiksaMs" integer DEFAULT 0 NOT NULL,
    "diperiksaKk" integer DEFAULT 0 NOT NULL,
    "diperiksaPddk" integer DEFAULT 0 NOT NULL,
    status public."StatusLaporan" DEFAULT 'DRAFT'::public."StatusLaporan" NOT NULL,
    catatan text,
    "createdBy" integer,
    "updatedBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.laporan_spal OWNER TO postgres;

--
-- Name: laporan_spal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.laporan_spal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.laporan_spal_id_seq OWNER TO postgres;

--
-- Name: laporan_spal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.laporan_spal_id_seq OWNED BY public.laporan_spal.id;


--
-- Name: laporan_tpp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laporan_tpp (
    id integer NOT NULL,
    "puskesmasId" integer NOT NULL,
    bulan integer NOT NULL,
    tahun integer NOT NULL,
    "jenisTppId" integer NOT NULL,
    terdaftar integer DEFAULT 0 NOT NULL,
    diperiksa integer DEFAULT 0 NOT NULL,
    "laikJumlah" integer DEFAULT 0 NOT NULL,
    "laikPersen" double precision DEFAULT 0 NOT NULL,
    status public."StatusLaporan" DEFAULT 'DRAFT'::public."StatusLaporan" NOT NULL,
    catatan text,
    "createdBy" integer,
    "updatedBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.laporan_tpp OWNER TO postgres;

--
-- Name: laporan_tpp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.laporan_tpp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.laporan_tpp_id_seq OWNER TO postgres;

--
-- Name: laporan_tpp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.laporan_tpp_id_seq OWNED BY public.laporan_tpp.id;


--
-- Name: laporan_ttu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.laporan_ttu (
    id integer NOT NULL,
    "puskesmasId" integer NOT NULL,
    bulan integer NOT NULL,
    tahun integer NOT NULL,
    "jenisTtuId" integer NOT NULL,
    "jumlahTotal" integer DEFAULT 0 NOT NULL,
    ms integer DEFAULT 0 NOT NULL,
    tms integer DEFAULT 0 NOT NULL,
    status public."StatusLaporan" DEFAULT 'DRAFT'::public."StatusLaporan" NOT NULL,
    catatan text,
    "createdBy" integer,
    "updatedBy" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.laporan_ttu OWNER TO postgres;

--
-- Name: laporan_ttu_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.laporan_ttu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.laporan_ttu_id_seq OWNER TO postgres;

--
-- Name: laporan_ttu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.laporan_ttu_id_seq OWNED BY public.laporan_ttu.id;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notification OWNER TO postgres;

--
-- Name: notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_id_seq OWNER TO postgres;

--
-- Name: notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_id_seq OWNED BY public.notification.id;


--
-- Name: puskesmas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.puskesmas (
    id integer NOT NULL,
    nama text NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.puskesmas OWNER TO postgres;

--
-- Name: puskesmas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.puskesmas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.puskesmas_id_seq OWNER TO postgres;

--
-- Name: puskesmas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.puskesmas_id_seq OWNED BY public.puskesmas.id;


--
-- Name: security_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_log (
    id integer NOT NULL,
    "eventType" text NOT NULL,
    ip text NOT NULL,
    path text,
    "userAgent" text,
    detail text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.security_log OWNER TO postgres;

--
-- Name: security_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_log_id_seq OWNER TO postgres;

--
-- Name: security_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_log_id_seq OWNED BY public.security_log.id;


--
-- Name: target; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.target (
    id integer NOT NULL,
    tahun integer NOT NULL,
    jenis text NOT NULL,
    "puskesmasId" integer,
    "targetPersen" double precision DEFAULT 80 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.target OWNER TO postgres;

--
-- Name: target_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.target_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.target_id_seq OWNER TO postgres;

--
-- Name: target_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.target_id_seq OWNED BY public.target.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    nama text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'OPERATOR'::public."Role" NOT NULL,
    "puskesmasId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: InspectionField id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionField" ALTER COLUMN id SET DEFAULT nextval('public."InspectionField_id_seq"'::regclass);


--
-- Name: InspectionResult id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult" ALTER COLUMN id SET DEFAULT nextval('public."InspectionResult_id_seq"'::regclass);


--
-- Name: InspectionResultValue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResultValue" ALTER COLUMN id SET DEFAULT nextval('public."InspectionResultValue_id_seq"'::regclass);


--
-- Name: InspectionTemplate id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionTemplate" ALTER COLUMN id SET DEFAULT nextval('public."InspectionTemplate_id_seq"'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: changelog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changelog ALTER COLUMN id SET DEFAULT nextval('public.changelog_id_seq'::regclass);


--
-- Name: dynamic_category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_category ALTER COLUMN id SET DEFAULT nextval('public.dynamic_category_id_seq'::regclass);


--
-- Name: dynamic_compliance_formula id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_compliance_formula ALTER COLUMN id SET DEFAULT nextval('public.dynamic_compliance_formula_id_seq'::regclass);


--
-- Name: dynamic_laporan id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan ALTER COLUMN id SET DEFAULT nextval('public.dynamic_laporan_id_seq'::regclass);


--
-- Name: dynamic_laporan_value id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan_value ALTER COLUMN id SET DEFAULT nextval('public.dynamic_laporan_value_id_seq'::regclass);


--
-- Name: dynamic_parameter id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_parameter ALTER COLUMN id SET DEFAULT nextval('public.dynamic_parameter_id_seq'::regclass);


--
-- Name: dynamic_sub_category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_sub_category ALTER COLUMN id SET DEFAULT nextval('public.dynamic_sub_category_id_seq'::regclass);


--
-- Name: dynamic_target id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_target ALTER COLUMN id SET DEFAULT nextval('public.dynamic_target_id_seq'::regclass);


--
-- Name: jenis_sarana id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jenis_sarana ALTER COLUMN id SET DEFAULT nextval('public.jenis_sarana_id_seq'::regclass);


--
-- Name: jenis_tpp id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jenis_tpp ALTER COLUMN id SET DEFAULT nextval('public.jenis_tpp_id_seq'::regclass);


--
-- Name: jenis_ttu id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jenis_ttu ALTER COLUMN id SET DEFAULT nextval('public.jenis_ttu_id_seq'::regclass);


--
-- Name: laporan_jamban id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_jamban ALTER COLUMN id SET DEFAULT nextval('public.laporan_jamban_id_seq'::regclass);


--
-- Name: laporan_rumah id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_rumah ALTER COLUMN id SET DEFAULT nextval('public.laporan_rumah_id_seq'::regclass);


--
-- Name: laporan_sab id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_sab ALTER COLUMN id SET DEFAULT nextval('public.laporan_sab_id_seq'::regclass);


--
-- Name: laporan_spal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_spal ALTER COLUMN id SET DEFAULT nextval('public.laporan_spal_id_seq'::regclass);


--
-- Name: laporan_tpp id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_tpp ALTER COLUMN id SET DEFAULT nextval('public.laporan_tpp_id_seq'::regclass);


--
-- Name: laporan_ttu id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_ttu ALTER COLUMN id SET DEFAULT nextval('public.laporan_ttu_id_seq'::regclass);


--
-- Name: notification id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification ALTER COLUMN id SET DEFAULT nextval('public.notification_id_seq'::regclass);


--
-- Name: puskesmas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puskesmas ALTER COLUMN id SET DEFAULT nextval('public.puskesmas_id_seq'::regclass);


--
-- Name: security_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_log ALTER COLUMN id SET DEFAULT nextval('public.security_log_id_seq'::regclass);


--
-- Name: target id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.target ALTER COLUMN id SET DEFAULT nextval('public.target_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: InspectionField InspectionField_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionField"
    ADD CONSTRAINT "InspectionField_pkey" PRIMARY KEY (id);


--
-- Name: InspectionResultValue InspectionResultValue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResultValue"
    ADD CONSTRAINT "InspectionResultValue_pkey" PRIMARY KEY (id);


--
-- Name: InspectionResult InspectionResult_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult"
    ADD CONSTRAINT "InspectionResult_pkey" PRIMARY KEY (id);


--
-- Name: InspectionTemplate InspectionTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionTemplate"
    ADD CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: changelog changelog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_pkey PRIMARY KEY (id);


--
-- Name: dynamic_category dynamic_category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_category
    ADD CONSTRAINT dynamic_category_pkey PRIMARY KEY (id);


--
-- Name: dynamic_compliance_formula dynamic_compliance_formula_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_compliance_formula
    ADD CONSTRAINT dynamic_compliance_formula_pkey PRIMARY KEY (id);


--
-- Name: dynamic_laporan dynamic_laporan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan
    ADD CONSTRAINT dynamic_laporan_pkey PRIMARY KEY (id);


--
-- Name: dynamic_laporan_value dynamic_laporan_value_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan_value
    ADD CONSTRAINT dynamic_laporan_value_pkey PRIMARY KEY (id);


--
-- Name: dynamic_parameter dynamic_parameter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_parameter
    ADD CONSTRAINT dynamic_parameter_pkey PRIMARY KEY (id);


--
-- Name: dynamic_sub_category dynamic_sub_category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_sub_category
    ADD CONSTRAINT dynamic_sub_category_pkey PRIMARY KEY (id);


--
-- Name: dynamic_target dynamic_target_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_target
    ADD CONSTRAINT dynamic_target_pkey PRIMARY KEY (id);


--
-- Name: jenis_sarana jenis_sarana_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jenis_sarana
    ADD CONSTRAINT jenis_sarana_pkey PRIMARY KEY (id);


--
-- Name: jenis_tpp jenis_tpp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jenis_tpp
    ADD CONSTRAINT jenis_tpp_pkey PRIMARY KEY (id);


--
-- Name: jenis_ttu jenis_ttu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jenis_ttu
    ADD CONSTRAINT jenis_ttu_pkey PRIMARY KEY (id);


--
-- Name: laporan_jamban laporan_jamban_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_jamban
    ADD CONSTRAINT laporan_jamban_pkey PRIMARY KEY (id);


--
-- Name: laporan_rumah laporan_rumah_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_rumah
    ADD CONSTRAINT laporan_rumah_pkey PRIMARY KEY (id);


--
-- Name: laporan_sab laporan_sab_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_sab
    ADD CONSTRAINT laporan_sab_pkey PRIMARY KEY (id);


--
-- Name: laporan_spal laporan_spal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_spal
    ADD CONSTRAINT laporan_spal_pkey PRIMARY KEY (id);


--
-- Name: laporan_tpp laporan_tpp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_tpp
    ADD CONSTRAINT laporan_tpp_pkey PRIMARY KEY (id);


--
-- Name: laporan_ttu laporan_ttu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_ttu
    ADD CONSTRAINT laporan_ttu_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: puskesmas puskesmas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puskesmas
    ADD CONSTRAINT puskesmas_pkey PRIMARY KEY (id);


--
-- Name: security_log security_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_log
    ADD CONSTRAINT security_log_pkey PRIMARY KEY (id);


--
-- Name: target target_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT target_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: audit_log_tableName_recordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_log_tableName_recordId_idx" ON public.audit_log USING btree ("tableName", "recordId");


--
-- Name: audit_log_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_log_userId_createdAt_idx" ON public.audit_log USING btree ("userId", "createdAt");


--
-- Name: changelog_tableName_recordId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "changelog_tableName_recordId_idx" ON public.changelog USING btree ("tableName", "recordId");


--
-- Name: dynamic_category_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX dynamic_category_code_key ON public.dynamic_category USING btree (code);


--
-- Name: dynamic_category_nama_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX dynamic_category_nama_key ON public.dynamic_category USING btree (nama);


--
-- Name: dynamic_compliance_formula_categoryId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "dynamic_compliance_formula_categoryId_key" ON public.dynamic_compliance_formula USING btree ("categoryId");


--
-- Name: dynamic_laporan_categoryId_bulan_tahun_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "dynamic_laporan_categoryId_bulan_tahun_idx" ON public.dynamic_laporan USING btree ("categoryId", bulan, tahun);


--
-- Name: dynamic_laporan_puskesmasId_categoryId_bulan_tahun_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "dynamic_laporan_puskesmasId_categoryId_bulan_tahun_key" ON public.dynamic_laporan USING btree ("puskesmasId", "categoryId", bulan, tahun);


--
-- Name: dynamic_laporan_puskesmasId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "dynamic_laporan_puskesmasId_idx" ON public.dynamic_laporan USING btree ("puskesmasId");


--
-- Name: dynamic_laporan_value_laporanId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "dynamic_laporan_value_laporanId_idx" ON public.dynamic_laporan_value USING btree ("laporanId");


--
-- Name: dynamic_laporan_value_laporanId_parameterId_subCategoryId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "dynamic_laporan_value_laporanId_parameterId_subCategoryId_key" ON public.dynamic_laporan_value USING btree ("laporanId", "parameterId", "subCategoryId");


--
-- Name: dynamic_laporan_value_parameterId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "dynamic_laporan_value_parameterId_idx" ON public.dynamic_laporan_value USING btree ("parameterId");


--
-- Name: dynamic_parameter_categoryId_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "dynamic_parameter_categoryId_code_key" ON public.dynamic_parameter USING btree ("categoryId", code);


--
-- Name: dynamic_sub_category_categoryId_nama_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "dynamic_sub_category_categoryId_nama_key" ON public.dynamic_sub_category USING btree ("categoryId", nama);


--
-- Name: dynamic_target_tahun_categoryId_puskesmasId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "dynamic_target_tahun_categoryId_puskesmasId_key" ON public.dynamic_target USING btree (tahun, "categoryId", "puskesmasId");


--
-- Name: jenis_sarana_nama_kategori_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX jenis_sarana_nama_kategori_key ON public.jenis_sarana USING btree (nama, kategori);


--
-- Name: jenis_tpp_nama_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX jenis_tpp_nama_key ON public.jenis_tpp USING btree (nama);


--
-- Name: jenis_ttu_nama_kategori_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX jenis_ttu_nama_kategori_key ON public.jenis_ttu USING btree (nama, kategori);


--
-- Name: laporan_jamban_bulan_tahun_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX laporan_jamban_bulan_tahun_idx ON public.laporan_jamban USING btree (bulan, tahun);


--
-- Name: laporan_jamban_puskesmasId_bulan_tahun_jenisSaranaId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "laporan_jamban_puskesmasId_bulan_tahun_jenisSaranaId_key" ON public.laporan_jamban USING btree ("puskesmasId", bulan, tahun, "jenisSaranaId");


--
-- Name: laporan_jamban_puskesmasId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "laporan_jamban_puskesmasId_idx" ON public.laporan_jamban USING btree ("puskesmasId");


--
-- Name: laporan_rumah_bulan_tahun_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX laporan_rumah_bulan_tahun_idx ON public.laporan_rumah USING btree (bulan, tahun);


--
-- Name: laporan_rumah_puskesmasId_bulan_tahun_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "laporan_rumah_puskesmasId_bulan_tahun_key" ON public.laporan_rumah USING btree ("puskesmasId", bulan, tahun);


--
-- Name: laporan_rumah_puskesmasId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "laporan_rumah_puskesmasId_idx" ON public.laporan_rumah USING btree ("puskesmasId");


--
-- Name: laporan_sab_bulan_tahun_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX laporan_sab_bulan_tahun_idx ON public.laporan_sab USING btree (bulan, tahun);


--
-- Name: laporan_sab_puskesmasId_bulan_tahun_jenisSaranaId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "laporan_sab_puskesmasId_bulan_tahun_jenisSaranaId_key" ON public.laporan_sab USING btree ("puskesmasId", bulan, tahun, "jenisSaranaId");


--
-- Name: laporan_sab_puskesmasId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "laporan_sab_puskesmasId_idx" ON public.laporan_sab USING btree ("puskesmasId");


--
-- Name: laporan_spal_bulan_tahun_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX laporan_spal_bulan_tahun_idx ON public.laporan_spal USING btree (bulan, tahun);


--
-- Name: laporan_spal_puskesmasId_bulan_tahun_jenisSaranaId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "laporan_spal_puskesmasId_bulan_tahun_jenisSaranaId_key" ON public.laporan_spal USING btree ("puskesmasId", bulan, tahun, "jenisSaranaId");


--
-- Name: laporan_spal_puskesmasId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "laporan_spal_puskesmasId_idx" ON public.laporan_spal USING btree ("puskesmasId");


--
-- Name: laporan_tpp_bulan_tahun_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX laporan_tpp_bulan_tahun_idx ON public.laporan_tpp USING btree (bulan, tahun);


--
-- Name: laporan_tpp_puskesmasId_bulan_tahun_jenisTppId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "laporan_tpp_puskesmasId_bulan_tahun_jenisTppId_key" ON public.laporan_tpp USING btree ("puskesmasId", bulan, tahun, "jenisTppId");


--
-- Name: laporan_tpp_puskesmasId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "laporan_tpp_puskesmasId_idx" ON public.laporan_tpp USING btree ("puskesmasId");


--
-- Name: laporan_ttu_bulan_tahun_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX laporan_ttu_bulan_tahun_idx ON public.laporan_ttu USING btree (bulan, tahun);


--
-- Name: laporan_ttu_puskesmasId_bulan_tahun_jenisTtuId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "laporan_ttu_puskesmasId_bulan_tahun_jenisTtuId_key" ON public.laporan_ttu USING btree ("puskesmasId", bulan, tahun, "jenisTtuId");


--
-- Name: laporan_ttu_puskesmasId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "laporan_ttu_puskesmasId_idx" ON public.laporan_ttu USING btree ("puskesmasId");


--
-- Name: notification_userId_isRead_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notification_userId_isRead_createdAt_idx" ON public.notification USING btree ("userId", "isRead", "createdAt");


--
-- Name: puskesmas_nama_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX puskesmas_nama_key ON public.puskesmas USING btree (nama);


--
-- Name: security_log_eventType_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "security_log_eventType_createdAt_idx" ON public.security_log USING btree ("eventType", "createdAt");


--
-- Name: security_log_ip_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "security_log_ip_createdAt_idx" ON public.security_log USING btree (ip, "createdAt");


--
-- Name: target_tahun_jenis_puskesmasId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "target_tahun_jenis_puskesmasId_key" ON public.target USING btree (tahun, jenis, "puskesmasId");


--
-- Name: user_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_email_key ON public."user" USING btree (email);


--
-- Name: InspectionField InspectionField_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionField"
    ADD CONSTRAINT "InspectionField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."InspectionTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InspectionResultValue InspectionResultValue_fieldId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResultValue"
    ADD CONSTRAINT "InspectionResultValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES public."InspectionField"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InspectionResultValue InspectionResultValue_resultId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResultValue"
    ADD CONSTRAINT "InspectionResultValue_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES public."InspectionResult"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InspectionResult InspectionResult_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult"
    ADD CONSTRAINT "InspectionResult_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InspectionResult InspectionResult_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult"
    ADD CONSTRAINT "InspectionResult_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."InspectionTemplate"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InspectionResult InspectionResult_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionResult"
    ADD CONSTRAINT "InspectionResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InspectionTemplate InspectionTemplate_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionTemplate"
    ADD CONSTRAINT "InspectionTemplate_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InspectionTemplate InspectionTemplate_subCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."InspectionTemplate"
    ADD CONSTRAINT "InspectionTemplate_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES public.dynamic_sub_category(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_log audit_log_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: changelog changelog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT "changelog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dynamic_compliance_formula dynamic_compliance_formula_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_compliance_formula
    ADD CONSTRAINT "dynamic_compliance_formula_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.dynamic_category(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dynamic_laporan dynamic_laporan_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan
    ADD CONSTRAINT "dynamic_laporan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.dynamic_category(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dynamic_laporan dynamic_laporan_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan
    ADD CONSTRAINT "dynamic_laporan_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dynamic_laporan_value dynamic_laporan_value_laporanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan_value
    ADD CONSTRAINT "dynamic_laporan_value_laporanId_fkey" FOREIGN KEY ("laporanId") REFERENCES public.dynamic_laporan(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dynamic_laporan_value dynamic_laporan_value_parameterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan_value
    ADD CONSTRAINT "dynamic_laporan_value_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES public.dynamic_parameter(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dynamic_laporan_value dynamic_laporan_value_subCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_laporan_value
    ADD CONSTRAINT "dynamic_laporan_value_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES public.dynamic_sub_category(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dynamic_parameter dynamic_parameter_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_parameter
    ADD CONSTRAINT "dynamic_parameter_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.dynamic_category(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dynamic_sub_category dynamic_sub_category_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_sub_category
    ADD CONSTRAINT "dynamic_sub_category_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.dynamic_category(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dynamic_target dynamic_target_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dynamic_target
    ADD CONSTRAINT "dynamic_target_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.dynamic_category(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: laporan_jamban laporan_jamban_jenisSaranaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_jamban
    ADD CONSTRAINT "laporan_jamban_jenisSaranaId_fkey" FOREIGN KEY ("jenisSaranaId") REFERENCES public.jenis_sarana(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_jamban laporan_jamban_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_jamban
    ADD CONSTRAINT "laporan_jamban_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_rumah laporan_rumah_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_rumah
    ADD CONSTRAINT "laporan_rumah_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_sab laporan_sab_jenisSaranaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_sab
    ADD CONSTRAINT "laporan_sab_jenisSaranaId_fkey" FOREIGN KEY ("jenisSaranaId") REFERENCES public.jenis_sarana(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_sab laporan_sab_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_sab
    ADD CONSTRAINT "laporan_sab_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_spal laporan_spal_jenisSaranaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_spal
    ADD CONSTRAINT "laporan_spal_jenisSaranaId_fkey" FOREIGN KEY ("jenisSaranaId") REFERENCES public.jenis_sarana(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_spal laporan_spal_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_spal
    ADD CONSTRAINT "laporan_spal_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_tpp laporan_tpp_jenisTppId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_tpp
    ADD CONSTRAINT "laporan_tpp_jenisTppId_fkey" FOREIGN KEY ("jenisTppId") REFERENCES public.jenis_tpp(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_tpp laporan_tpp_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_tpp
    ADD CONSTRAINT "laporan_tpp_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_ttu laporan_ttu_jenisTtuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_ttu
    ADD CONSTRAINT "laporan_ttu_jenisTtuId_fkey" FOREIGN KEY ("jenisTtuId") REFERENCES public.jenis_ttu(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: laporan_ttu laporan_ttu_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.laporan_ttu
    ADD CONSTRAINT "laporan_ttu_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notification notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: target target_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT "target_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user user_puskesmasId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "user_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES public.puskesmas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict pFRFLYRGEkYtYjNRDCzNrUBMljycuJS78Ot4z9g2gNsiuhGRtzC3DL2cdvvVKGA

